<script>
  /**
   * 공통 코드 관리 [구현][ADMIN]
   * 그룹 선택 → 코드 목록. 표시명·정렬순서·설명(일반 그룹은 사용 여부까지)을 그리드에서 고친 뒤 [Save]로 바뀐 행만 저장
   * 그룹: [그룹 추가](항상 일반 그룹) / [그룹 수정](이름·설명·순서) / [그룹 삭제](일반 그룹, 코드가 없을 때만)
   * - 시스템 그룹(거래 유형·역할·상태·리밸런싱): 코드값이 로직에 연결 — 추가·삭제·사용중지 불가
   * - 일반 그룹(증권사·통화·시장): [Add]로 추가, [Remove]로 삭제 (데이터에서 쓰는 코드는 삭제 대신 사용중지)
   * 변경 후 공통 코드 저장소를 다시 불러와 다른 화면의 표시명·선택 목록에 바로 반영한다.
   * API: commonCodeApi.list / createGroup / updateGroup / removeGroup / createCode / updateCode / removeCode
   */
  import { tick } from 'svelte';
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { commonCodeApi } from '$lib/api/commonCodeApi';
  import { codes, loadCodes } from '$lib/stores/codeStore';

  const ACTIVE_ITEMS = [
    { text: '사용', value: 'Y' },
    { text: '사용중지', value: 'N' }
  ];

  /**
   * 그룹 종류에 따라 편집 가능한 컬럼이 다르다 (시스템 그룹은 사용 여부 편집 불가).
   * @param {boolean} isSystem
   */
  function buildColumns(isSystem) {
    return [
      { header: '코드', name: 'code', width: 160, sortable: true },
      { header: '표시명 ✎', name: 'name', minWidth: 160, editor: 'text' },
      { header: '정렬순서 ✎', name: 'sortOrder', align: 'right', width: 100, editor: 'text', sortable: true },
      isSystem
        ? { header: '사용', name: 'activeYn', align: 'center', width: 100, formatter: (/** @type {any} */ { value }) => (value === 'Y' ? '사용' : '사용중지') }
        : {
            header: '사용 ✎',
            name: 'activeYn',
            align: 'center',
            width: 110,
            formatter: 'listItemText',
            editor: { type: 'select', options: { instantApply: true, listItems: ACTIVE_ITEMS } }
          },
      { header: '설명 ✎', name: 'description', minWidth: 240, editor: 'text' }
    ];
  }

  /** @type {any} */
  let grid;
  let groupCode = $state('');
  let loadedGroupCode = '';
  const groupOptions = $derived(
    Object.values($codes).map((g) => ({ value: g.groupCode, label: `${g.name} (${g.groupCode})${g.isSystem ? ' · 시스템' : ''}` }))
  );
  const group = $derived($codes[groupCode]);

  let isAddOpen = $state(false);
  let form = $state({ code: '', name: '', description: '' });

  // 그룹 추가·수정 팝업 (editingGroup = null 이면 추가)
  let isGroupOpen = $state(false);
  /** @type {string|null} */
  let editingGroup = $state(null);
  let groupForm = $state({ groupCode: '', name: '', description: '', sortOrder: '' });

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  /** @returns {any[]} 바뀐 행 (저장 대상) */
  function changedRows() {
    const updated = /** @type {any[]} */ (grid?.getModifiedRows()?.updatedRows ?? []);
    return updated.filter(
      (r) => r.name !== r.original.name || String(r.sortOrder) !== String(r.original.sortOrder) || r.activeYn !== r.original.activeYn || (r.description ?? '') !== (r.original.description ?? '')
    );
  }

  /** @param {any} g */
  async function handleReady(g) {
    grid = g;
    try {
      await loadCodes(true);
      groupCode = Object.keys($codes)[0] ?? '';
      renderGroup();
    } catch (error) {
      alert(`공통 코드를 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  /** 저장소의 현재 그룹 코드를 그리드에 그린다 */
  function renderGroup() {
    loadedGroupCode = groupCode;
    const g = $codes[groupCode];
    if (!grid || !g) return;
    grid.setColumns(buildColumns(g.isSystem));
    grid.resetData(
      g.codes.map((c) => {
        const row = { code: c.code, name: c.name, sortOrder: c.sortOrder, activeYn: c.isActive ? 'Y' : 'N', description: c.description ?? '' };
        return { ...row, original: { ...row } };
      })
    );
  }

  async function reload() {
    try {
      await loadCodes(true);
      renderGroup();
    } catch (error) {
      alert(`공통 코드를 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  /** 저장 안 된 변경이 있으면 확인 후 진행 */
  function confirmDiscard() {
    grid?.finishEditing();
    const n = changedRows().length;
    return n === 0 || confirm(`저장하지 않은 변경 ${n}건이 있습니다. 무시하고 진행할까요?`);
  }

  function handleGroupChange() {
    if (!confirmDiscard()) {
      groupCode = loadedGroupCode;
      return;
    }
    renderGroup();
  }

  async function save() {
    grid?.finishEditing();
    const rows = changedRows();
    if (rows.length === 0) {
      alert('변경된 코드가 없습니다.');
      return;
    }
    for (const r of rows) {
      if (!String(r.name ?? '').trim()) return alert(`${r.code}: 표시명을 입력하세요.`);
      if (!/^-?\d+$/.test(String(r.sortOrder).trim())) return alert(`${r.code}: 정렬순서는 정수로 입력하세요.`);
    }
    /** @type {string[]} */
    const failures = [];
    for (const r of rows) {
      try {
        await commonCodeApi.updateCode(groupCode, r.code, {
          name: String(r.name).trim(),
          description: String(r.description ?? '').trim() || null,
          sortOrder: Number(String(r.sortOrder).trim()),
          isActive: r.activeYn === 'Y'
        });
      } catch (error) {
        failures.push(`${r.code}: ${errorMessage(error)}`);
      }
    }
    if (failures.length > 0) alert(`일부 코드를 저장하지 못했습니다.\n${failures.join('\n')}`);
    await reload();
  }

  function openAdd() {
    if (!group) return;
    if (group.isSystem) {
      alert('시스템 코드 그룹에는 코드를 추가할 수 없습니다. 표시명·순서·설명만 수정할 수 있습니다.');
      return;
    }
    if (!confirmDiscard()) return;
    form = { code: '', name: '', description: '' };
    isAddOpen = true;
  }

  /** 검증 실패 시 Modal이 닫힌 뒤 다시 연다 @param {string} message */
  async function reject(message) {
    alert(message);
    await tick();
    isAddOpen = true;
  }

  // ==================== 그룹 ====================

  function openGroupAdd() {
    if (!confirmDiscard()) return;
    editingGroup = null;
    groupForm = { groupCode: '', name: '', description: '', sortOrder: '' };
    isGroupOpen = true;
  }

  function openGroupEdit() {
    if (!group || !confirmDiscard()) return;
    editingGroup = group.groupCode;
    groupForm = { groupCode: group.groupCode, name: group.name, description: group.description ?? '', sortOrder: String(group.sortOrder ?? 0) };
    isGroupOpen = true;
  }

  /** 검증 실패 시 그룹 팝업을 다시 연다 @param {string} message */
  async function rejectGroup(message) {
    alert(message);
    await tick();
    isGroupOpen = true;
  }

  async function saveGroup() {
    const name = groupForm.name.trim();
    const description = groupForm.description.trim() || null;
    if (!name) return rejectGroup('그룹명을 입력하세요.');
    const sortText = String(groupForm.sortOrder ?? '').trim();
    if (sortText !== '' && !/^-?\d+$/.test(sortText)) return rejectGroup('정렬순서는 정수로 입력하세요.');
    try {
      if (editingGroup === null) {
        const newCode = groupForm.groupCode.trim().toUpperCase();
        if (!newCode) return rejectGroup('그룹 코드를 입력하세요.');
        await commonCodeApi.createGroup({ groupCode: newCode, name, description, sortOrder: sortText === '' ? null : Number(sortText) });
        await loadCodes(true);
        groupCodeSelect(newCode); // 새 그룹을 선택해 바로 코드를 추가할 수 있게
      } else {
        await commonCodeApi.updateGroup(editingGroup, { name, description, sortOrder: sortText === '' ? 0 : Number(sortText) });
        await reload();
      }
    } catch (error) {
      alert(`그룹을 저장하지 못했습니다.
${errorMessage(error)}`);
      isGroupOpen = true; // 입력값을 유지한 채 팝업을 다시 연다
    }
  }

  /** 새로 만든 그룹을 선택해 보여준다 @param {string} code */
  function groupCodeSelect(code) {
    groupCode = code;
    renderGroup();
  }

  async function removeGroup() {
    if (!group) return;
    if (group.isSystem) {
      alert('시스템 코드 그룹은 삭제할 수 없습니다.');
      return;
    }
    if (!confirm(`'${group.name} (${group.groupCode})' 그룹을 삭제할까요?
코드가 남아 있으면 삭제되지 않습니다.`)) return;
    try {
      await commonCodeApi.removeGroup(group.groupCode);
      await loadCodes(true);
      groupCode = Object.keys($codes)[0] ?? '';
      renderGroup();
    } catch (error) {
      alert(`그룹을 삭제하지 못했습니다.
${errorMessage(error)}`);
    }
  }

  async function create() {
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code || !name) return reject('코드와 표시명을 입력하세요.');
    try {
      await commonCodeApi.createCode(groupCode, { code, name, description: form.description.trim() || null });
      await reload();
    } catch (error) {
      alert(`추가에 실패했습니다.\n${errorMessage(error)}`);
      isAddOpen = true; // 입력값을 유지한 채 팝업을 다시 연다
    }
  }

  async function removeChecked() {
    if (!group) return;
    if (group.isSystem) {
      alert('시스템 코드는 삭제할 수 없습니다.');
      return;
    }
    const rows = grid?.getCheckedRows() ?? [];
    if (rows.length === 0) {
      alert('삭제할 코드를 체크하세요.');
      return;
    }
    if (!confirm(`선택한 코드 ${rows.length}개를 삭제할까요?\n${rows.map((/** @type {any} */ r) => `${r.code} (${r.name})`).join(', ')}`)) return;
    /** @type {string[]} */
    const failures = [];
    for (const r of rows) {
      try {
        await commonCodeApi.removeCode(groupCode, r.code);
      } catch (error) {
        failures.push(`${r.code}: ${errorMessage(error)}`);
      }
    }
    if (failures.length > 0) alert(`일부 코드를 삭제하지 못했습니다.\n${failures.join('\n')}`);
    await reload();
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: () => confirmDiscard() && reload() },
    { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
    { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: removeChecked },
    { label: 'Save', color: BUTTON_COLORS.BLUE, iconType: 'save', onClick: save }
  ];

  const inputClass = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const groupButtonClass = 'whitespace-nowrap rounded border px-2 py-1.5 text-xs font-medium';
</script>

<StandardListPage title="공통 코드 관리" columns={buildColumns(true)} {actions} onReady={handleReady}>
  {#snippet filters()}
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
      <LookupComboBox id="cc-group" label="코드 그룹" class="sm:col-span-2" options={groupOptions} bind:value={groupCode} placeholder="" onchange={handleGroupChange} />
      <div class="sm:col-span-1 lg:col-span-2 flex flex-wrap gap-1.5 items-end">
        <button type="button" onclick={openGroupAdd} class="{groupButtonClass} text-emerald-700 border-emerald-300 hover:bg-emerald-50">그룹 추가</button>
        <button type="button" onclick={openGroupEdit} class="{groupButtonClass} text-indigo-700 border-indigo-300 hover:bg-indigo-50">그룹 수정</button>
        <button type="button" onclick={removeGroup} class="{groupButtonClass} text-rose-700 border-rose-300 hover:bg-rose-50">그룹 삭제</button>
      </div>
      <div class="sm:col-span-3 lg:col-span-2 text-xs space-y-0.5">
        {#if group}
          <div class="text-gray-600">{group.description ?? ''}</div>
          {#if group.isSystem}
            <div class="text-amber-600">시스템 코드 — 코드값이 프로그램 동작과 연결돼 있어 표시명·정렬순서·설명만 고칠 수 있습니다.</div>
          {:else}
            <div class="text-gray-400">✎ 컬럼을 더블클릭해 고친 뒤 [Save]. 데이터에서 쓰는 코드는 삭제 대신 '사용중지'로 바꾸세요 (새 입력 목록에서만 빠짐).</div>
          {/if}
        {/if}
      </div>
    </div>
  {/snippet}

  <Modal bind:isOpen={isGroupOpen} title={editingGroup === null ? '코드 그룹 추가' : '코드 그룹 수정'} onSave={saveGroup}>
    <div>
      <label for="cg-code" class={labelClass}>그룹 코드</label>
      <input id="cg-code" type="text" maxlength="30" bind:value={groupForm.groupCode} disabled={editingGroup !== null} placeholder="예: ACCOUNT_TYPE (영문 대문자·숫자·_)" class="{inputClass} disabled:bg-gray-100 disabled:text-gray-500" />
      {#if editingGroup === null}
        <p class="mt-1 text-xs text-gray-400">추가한 뒤에는 바꿀 수 없습니다. 화면에서 만드는 그룹은 일반 그룹(코드 추가·삭제 가능)입니다.</p>
      {/if}
    </div>
    <div>
      <label for="cg-name" class={labelClass}>그룹명</label>
      <input id="cg-name" type="text" maxlength="50" bind:value={groupForm.name} class={inputClass} />
    </div>
    <div>
      <label for="cg-desc" class={labelClass}>설명</label>
      <input id="cg-desc" type="text" bind:value={groupForm.description} placeholder="예: 이 코드를 쓰는 화면·컬럼" class={inputClass} />
    </div>
    <div>
      <label for="cg-sort" class={labelClass}>정렬순서</label>
      <input id="cg-sort" type="text" bind:value={groupForm.sortOrder} placeholder={editingGroup === null ? '비우면 맨 뒤' : ''} class={inputClass} />
    </div>
  </Modal>

  <Modal bind:isOpen={isAddOpen} title="코드 추가 — {group?.name ?? ''}" onSave={create}>
    <div>
      <label for="cc-code" class={labelClass}>코드</label>
      <input id="cc-code" type="text" maxlength="30" bind:value={form.code} placeholder={groupCode === 'CURRENCY' ? '예: USD (영문 대문자 3자리)' : groupCode === 'MARKET' ? '예: KRX (영문 대문자·숫자)' : '예: KIWOOM'} class={inputClass} />
      <p class="mt-1 text-xs text-gray-400">데이터에 저장되는 값입니다. 추가한 뒤에는 바꿀 수 없습니다.</p>
    </div>
    <div>
      <label for="cc-name" class={labelClass}>표시명</label>
      <input id="cc-name" type="text" maxlength="50" bind:value={form.name} class={inputClass} />
    </div>
    <div>
      <label for="cc-desc" class={labelClass}>설명</label>
      <input id="cc-desc" type="text" bind:value={form.description} class={inputClass} />
    </div>
  </Modal>
</StandardListPage>
