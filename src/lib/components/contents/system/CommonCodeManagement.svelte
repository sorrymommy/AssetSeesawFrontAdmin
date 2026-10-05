<script>
  /**
   * 공통 코드 관리 [구현][ADMIN] — 마스터(그룹)·디테일(코드) 그리드
   * - 왼쪽 그룹 그리드에서 행을 고르면 오른쪽에 그 그룹의 코드가 나온다
   * - 두 그리드 모두 ✎ 컬럼을 더블클릭해 고치고, [행 추가]로 새 행, [삭제]로 체크한 행 삭제, [저장]으로 반영
   * - 그룹 코드·코드값은 새 행에서만 입력 (저장 후 변경 불가)
   * - 시스템 그룹: 코드 추가·삭제·사용중지 불가, 그룹 삭제 불가 (표시명·순서·설명만)
   * - 화면에서 만드는 그룹은 일반 그룹. 증권사·통화·시장 그룹과 코드가 남은 그룹은 삭제 불가 (서버 검증)
   * 저장 후 공통 코드 저장소를 다시 불러와 다른 화면의 표시명·선택 목록에 바로 반영한다.
   * API: commonCodeApi.list / createGroup / updateGroup / removeGroup / createCode / updateCode / removeCode
   */
  import { onMount, onDestroy } from 'svelte';
  import 'tui-grid/dist/tui-grid.css';
  import UiButton from '$lib/components/controls/Button.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { commonCodeApi } from '$lib/api/commonCodeApi';
  import { codes, loadCodes } from '$lib/stores/codeStore';

  const ACTIVE_ITEMS = [
    { text: '사용', value: 'Y' },
    { text: '사용중지', value: 'N' }
  ];
  const activeText = (/** @type {any} */ { value }) => (value === 'Y' ? '사용' : '사용중지');

  /** @type {any[]} tui-grid 컬럼 정의 */
  const groupColumns = [
    { header: '그룹 코드 ✎', name: 'groupCode', minWidth: 130, editor: 'text' },
    { header: '그룹명 ✎', name: 'name', minWidth: 120, editor: 'text' },
    { header: '순서 ✎', name: 'sortOrder', align: 'right', width: 70, editor: 'text' },
    { header: '구분', name: 'typeLabel', align: 'center', width: 70 },
    { header: '코드수', name: 'codeCount', align: 'right', width: 70 },
    { header: '설명 ✎', name: 'description', minWidth: 160, editor: 'text' }
  ];

  /**
   * 시스템 그룹은 사용 여부를 고칠 수 없어 컬럼 편집기를 뺀다
   * @param {boolean} isSystem
   * @returns {any[]}
   */
  function buildCodeColumns(isSystem) {
    return [
      { header: '코드 ✎', name: 'code', minWidth: 120, editor: 'text' },
      { header: '표시명 ✎', name: 'name', minWidth: 120, editor: 'text' },
      { header: '순서 ✎', name: 'sortOrder', align: 'right', width: 70, editor: 'text' },
      isSystem
        ? { header: '사용', name: 'activeYn', align: 'center', width: 90, formatter: activeText }
        : { header: '사용 ✎', name: 'activeYn', align: 'center', width: 100, formatter: 'listItemText', editor: { type: 'select', options: { instantApply: true, listItems: ACTIVE_ITEMS } } },
      { header: '설명 ✎', name: 'description', minWidth: 160, editor: 'text' }
    ];
  }

  /** @type {HTMLElement} */
  let groupEl;
  /** @type {HTMLElement} */
  let codeEl;
  /** @type {any} */
  let groupGrid;
  /** @type {any} */
  let codeGrid;
  /** @type {ResizeObserver | undefined} */
  let resizeObserver;

  /** 디테일에 표시 중인 그룹 코드 (새 그룹 행이면 null) */
  let selectedGroup = $state(/** @type {string|null} */ (null));
  const group = $derived(selectedGroup ? $codes[selectedGroup] : undefined);
  let isNewGroupSelected = $state(false);

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  const trimmed = (/** @type {any} */ v) => String(v ?? '').trim();
  const isInteger = (/** @type {any} */ v) => /^-?\d+$/.test(trimmed(v));
  /** 빈 순서는 null(서버가 맨 뒤로), 아니면 정수 @param {any} v */
  const sortOrNull = (v) => (trimmed(v) === '' ? null : Number(trimmed(v)));

  // ==================== 그리드 생성 ====================

  onMount(async () => {
    const { default: Grid } = await import('tui-grid');
    /** @type {any} 두 그리드 공통 옵션 */
    const common = { data: [], scrollX: true, scrollY: true, bodyHeight: 'fitToParent', rowHeaders: ['rowNum', 'checkbox'], columnOptions: { resizable: true } };
    groupGrid = new Grid({ ...common, el: groupEl, columns: groupColumns });
    codeGrid = new Grid({ ...common, el: codeEl, columns: buildCodeColumns(true) });

    // 그룹 행을 바꾸면 디테일을 그 그룹으로. 디테일에 저장 안 된 변경이 있으면 확인
    groupGrid.on('focusChange', (/** @type {any} */ ev) => {
      if (ev.rowKey === ev.prevRowKey || ev.rowKey === null || ev.rowKey === undefined) return;
      if (!confirmDiscardCodes()) {
        ev.stop();
        return;
      }
      showGroup(groupGrid.getRow(ev.rowKey));
    });

    // 숨김 탭에서 그려진 그리드를 다시 보일 때 바로잡는다 (창 크기 변경도 함께 잡힘)
    resizeObserver = new ResizeObserver(refreshLayout);
    resizeObserver.observe(groupEl);
    resizeObserver.observe(codeEl);
    try {
      await loadCodes(true);
      renderGroups();
    } catch (error) {
      alert(`공통 코드를 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  });

  onDestroy(() => {
    groupGrid?.destroy();
    codeGrid?.destroy();
    resizeObserver?.disconnect();
  });

  function refreshLayout() {
    // 숨김 상태(크기 0)에서는 계산하지 않는다
    if (!groupEl?.offsetWidth) return;
    groupGrid?.refreshLayout();
    codeGrid?.refreshLayout();
  }

  // ==================== 마스터 (그룹) ====================

  /** 저장소의 그룹을 마스터 그리드에 그리고, 선택했던 그룹을 다시 선택한다 @param {string|null} [keep] */
  function renderGroups(keep = selectedGroup) {
    const rows = Object.values($codes).map((g) => {
      const row = { groupCode: g.groupCode, name: g.name, sortOrder: g.sortOrder, description: g.description ?? '' };
      return { ...row, typeLabel: g.isSystem ? '시스템' : '일반', isSystem: g.isSystem, codeCount: g.codes.length, isNew: false, original: { ...row } };
    });
    groupGrid.resetData(rows);
    // 저장된 그룹의 그룹 코드는 바꿀 수 없다
    for (const r of groupGrid.getData()) groupGrid.disableCell(r.rowKey, 'groupCode');

    const target = groupGrid.getData().find((/** @type {any} */ r) => r.groupCode === keep) ?? groupGrid.getData()[0];
    showGroup(target ?? null);
    if (target) groupGrid.focus(target.rowKey, 'name');
    setTimeout(refreshLayout, 50);
  }

  /** @returns {any[]} 새 그룹 행 */
  function newGroupRows() {
    return groupGrid?.getData().filter((/** @type {any} */ r) => r.isNew) ?? [];
  }

  /** @returns {any[]} 값이 바뀐 기존 그룹 행 */
  function changedGroupRows() {
    return (groupGrid?.getData() ?? []).filter(
      (/** @type {any} */ r) =>
        !r.isNew && (trimmed(r.name) !== r.original.name || trimmed(r.sortOrder) !== String(r.original.sortOrder) || trimmed(r.description) !== r.original.description)
    );
  }

  function addGroupRow() {
    groupGrid.finishEditing();
    groupGrid.appendRow({ groupCode: '', name: '', sortOrder: '', description: '', typeLabel: '일반', isSystem: false, codeCount: 0, isNew: true }, { focus: true });
  }

  async function saveGroups() {
    groupGrid.finishEditing();
    const created = newGroupRows();
    const updated = changedGroupRows();
    if (created.length === 0 && updated.length === 0) return alert('변경된 그룹이 없습니다.');

    for (const r of [...created, ...updated]) {
      if (r.isNew && !trimmed(r.groupCode)) return alert('새 그룹의 그룹 코드를 입력하세요.');
      if (!trimmed(r.name)) return alert(`${trimmed(r.groupCode) || '새 그룹'}: 그룹명을 입력하세요.`);
      if (trimmed(r.sortOrder) !== '' && !isInteger(r.sortOrder)) return alert(`${trimmed(r.groupCode)}: 순서는 정수로 입력하세요.`);
    }

    /** @type {string[]} */
    const failures = [];
    let keep = selectedGroup;
    for (const r of created) {
      const groupCode = trimmed(r.groupCode).toUpperCase();
      try {
        await commonCodeApi.createGroup({ groupCode, name: trimmed(r.name), description: trimmed(r.description) || null, sortOrder: sortOrNull(r.sortOrder) });
        keep = groupCode; // 새로 만든 그룹을 선택해 바로 코드를 넣을 수 있게
      } catch (error) {
        failures.push(`${groupCode}: ${errorMessage(error)}`);
      }
    }
    for (const r of updated) {
      try {
        await commonCodeApi.updateGroup(r.groupCode, { name: trimmed(r.name), description: trimmed(r.description) || null, sortOrder: Number(trimmed(r.sortOrder) || 0) });
      } catch (error) {
        failures.push(`${r.groupCode}: ${errorMessage(error)}`);
      }
    }
    if (failures.length > 0) alert(`일부 그룹을 저장하지 못했습니다.\n${failures.join('\n')}`);
    await reloadAll(keep);
  }

  async function removeGroups() {
    groupGrid.finishEditing();
    const rows = /** @type {any[]} */ (groupGrid.getCheckedRows());
    if (rows.length === 0) return alert('삭제할 그룹을 체크하세요.');
    const system = rows.filter((r) => r.isSystem);
    if (system.length > 0) return alert(`시스템 코드 그룹은 삭제할 수 없습니다: ${system.map((r) => r.groupCode).join(', ')}`);
    if (!confirm(`체크한 그룹 ${rows.length}개를 삭제할까요?\n코드가 남아 있는 그룹은 삭제되지 않습니다.`)) return;

    /** @type {string[]} */
    const failures = [];
    for (const r of rows) {
      if (r.isNew) {
        groupGrid.removeRow(r.rowKey); // 저장 전 행은 화면에서만 지운다
        continue;
      }
      try {
        await commonCodeApi.removeGroup(r.groupCode);
      } catch (error) {
        failures.push(`${r.groupCode}: ${errorMessage(error)}`);
      }
    }
    if (failures.length > 0) alert(`일부 그룹을 삭제하지 못했습니다.\n${failures.join('\n')}`);
    if (rows.some((r) => !r.isNew)) await reloadAll(selectedGroup);
  }

  // ==================== 디테일 (코드) ====================

  /** 마스터에서 고른 그룹의 코드를 디테일에 그린다 @param {any} row 그룹 행 (없으면 비움) */
  function showGroup(row) {
    if (!row || row.isNew) {
      selectedGroup = null;
      isNewGroupSelected = !!row?.isNew;
      codeGrid.setColumns(buildCodeColumns(false));
      codeGrid.resetData([]);
      return;
    }
    selectedGroup = row.groupCode;
    isNewGroupSelected = false;
    const g = $codes[row.groupCode];
    codeGrid.setColumns(buildCodeColumns(g?.isSystem ?? true));
    codeGrid.resetData(
      (g?.codes ?? []).map((c) => {
        const r = { code: c.code, name: c.name, sortOrder: c.sortOrder, activeYn: c.isActive ? 'Y' : 'N', description: c.description ?? '' };
        return { ...r, isNew: false, original: { ...r } };
      })
    );
    for (const r of codeGrid.getData()) codeGrid.disableCell(r.rowKey, 'code');
    setTimeout(refreshLayout, 50);
  }

  /** @returns {any[]} 새 코드 행 */
  function newCodeRows() {
    return codeGrid?.getData().filter((/** @type {any} */ r) => r.isNew) ?? [];
  }

  /** @returns {any[]} 값이 바뀐 기존 코드 행 */
  function changedCodeRows() {
    return (codeGrid?.getData() ?? []).filter(
      (/** @type {any} */ r) =>
        !r.isNew &&
        (trimmed(r.name) !== r.original.name || trimmed(r.sortOrder) !== String(r.original.sortOrder) || r.activeYn !== r.original.activeYn || trimmed(r.description) !== r.original.description)
    );
  }

  /** 디테일에 저장 안 된 변경이 있으면 확인 */
  function confirmDiscardCodes() {
    codeGrid?.finishEditing();
    const n = newCodeRows().length + changedCodeRows().length;
    return n === 0 || confirm(`코드에 저장하지 않은 변경 ${n}건이 있습니다. 무시하고 이동할까요?`);
  }

  function addCodeRow() {
    if (isNewGroupSelected) return alert('새 그룹을 먼저 저장한 뒤 코드를 추가하세요.');
    if (!group) return alert('왼쪽에서 그룹을 선택하세요.');
    if (group.isSystem) return alert('시스템 코드 그룹에는 코드를 추가할 수 없습니다. 표시명·순서·설명만 수정할 수 있습니다.');
    codeGrid.finishEditing();
    codeGrid.appendRow({ code: '', name: '', sortOrder: '', activeYn: 'Y', description: '', isNew: true }, { focus: true });
  }

  async function saveCodes() {
    if (!group) return;
    codeGrid.finishEditing();
    const created = newCodeRows();
    const updated = changedCodeRows();
    if (created.length === 0 && updated.length === 0) return alert('변경된 코드가 없습니다.');

    for (const r of [...created, ...updated]) {
      if (r.isNew && !trimmed(r.code)) return alert('새 코드의 코드값을 입력하세요.');
      if (!trimmed(r.name)) return alert(`${trimmed(r.code) || '새 코드'}: 표시명을 입력하세요.`);
      if (trimmed(r.sortOrder) !== '' && !isInteger(r.sortOrder)) return alert(`${trimmed(r.code)}: 순서는 정수로 입력하세요.`);
    }

    const groupCode = group.groupCode;
    /** @type {string[]} */
    const failures = [];
    for (const r of created) {
      const code = trimmed(r.code);
      const description = trimmed(r.description) || null;
      try {
        const saved = await commonCodeApi.createCode(groupCode, { code, name: trimmed(r.name), description, sortOrder: sortOrNull(r.sortOrder) });
        // 추가 API는 항상 '사용'으로 만들므로, 새 행을 '사용중지'로 넣었으면 이어서 반영한다
        if (r.activeYn === 'N') {
          await commonCodeApi.updateCode(groupCode, code, { name: trimmed(r.name), description, sortOrder: saved?.sortOrder ?? 0, isActive: false });
        }
      } catch (error) {
        failures.push(`${code}: ${errorMessage(error)}`);
      }
    }
    for (const r of updated) {
      try {
        await commonCodeApi.updateCode(groupCode, r.code, { name: trimmed(r.name), description: trimmed(r.description) || null, sortOrder: Number(trimmed(r.sortOrder) || 0), isActive: r.activeYn === 'Y' });
      } catch (error) {
        failures.push(`${r.code}: ${errorMessage(error)}`);
      }
    }
    if (failures.length > 0) alert(`일부 코드를 저장하지 못했습니다.\n${failures.join('\n')}`);
    await reloadAll(groupCode);
  }

  async function removeCodes() {
    if (!group) return;
    codeGrid.finishEditing();
    const rows = /** @type {any[]} */ (codeGrid.getCheckedRows());
    if (rows.length === 0) return alert('삭제할 코드를 체크하세요.');
    if (group.isSystem) return alert('시스템 코드는 삭제할 수 없습니다.');
    if (!confirm(`체크한 코드 ${rows.length}개를 삭제할까요?\n${rows.map((r) => `${trimmed(r.code) || '(새 행)'} ${trimmed(r.name)}`).join(', ')}`)) return;

    /** @type {string[]} */
    const failures = [];
    for (const r of rows) {
      if (r.isNew) {
        codeGrid.removeRow(r.rowKey); // 저장 전 행은 화면에서만 지운다
        continue;
      }
      try {
        await commonCodeApi.removeCode(group.groupCode, r.code);
      } catch (error) {
        failures.push(`${r.code}: ${errorMessage(error)}`);
      }
    }
    if (failures.length > 0) alert(`일부 코드를 삭제하지 못했습니다.\n${failures.join('\n')}`);
    if (rows.some((r) => !r.isNew)) await reloadAll(group.groupCode);
  }

  /** 저장소를 다시 불러와 두 그리드를 다시 그린다 @param {string|null} keep 선택 유지할 그룹 */
  async function reloadAll(keep) {
    try {
      await loadCodes(true);
      renderGroups(keep);
    } catch (error) {
      alert(`공통 코드를 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  function handleReload() {
    groupGrid?.finishEditing();
    const n = newGroupRows().length + changedGroupRows().length;
    if (n > 0 && !confirm(`그룹에 저장하지 않은 변경 ${n}건이 있습니다. 무시하고 다시 불러올까요?`)) return;
    if (!confirmDiscardCodes()) return;
    reloadAll(selectedGroup);
  }
</script>

<div class="absolute inset-0 flex flex-col p-4 gap-3">
  <div class="flex items-center justify-between gap-4">
    <div class="min-w-0">
      <h2 class="text-sm font-semibold text-gray-700">공통 코드 관리</h2>
      <p class="text-xs text-gray-400">✎ 컬럼을 더블클릭해 고친 뒤 각 영역의 [저장]. 그룹 코드·코드값은 새 행에서만 입력합니다. 데이터에서 쓰는 코드는 삭제 대신 '사용중지'로 바꾸세요.</p>
    </div>
    <UiButton label="Search" color={BUTTON_COLORS.INDIGO} iconType="search" onclick={handleReload} />
  </div>

  <div class="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
    <!-- 마스터: 그룹 -->
    <section class="lg:w-5/12 min-h-[240px] flex-1 lg:flex-none flex flex-col bg-white rounded-lg shadow overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span class="text-sm font-semibold text-gray-700">코드 그룹</span>
        <div class="flex gap-2">
          <UiButton label="행 추가" color={BUTTON_COLORS.EMERALD} iconType="add" onclick={addGroupRow} />
          <UiButton label="삭제" color={BUTTON_COLORS.ROSE} iconType="remove" onclick={removeGroups} />
          <UiButton label="저장" color={BUTTON_COLORS.BLUE} iconType="save" onclick={saveGroups} />
        </div>
      </div>
      <div class="flex-1 min-h-0 relative"><div bind:this={groupEl} class="absolute inset-0"></div></div>
    </section>

    <!-- 디테일: 선택한 그룹의 코드 -->
    <section class="lg:w-7/12 min-h-[240px] flex-1 lg:flex-none flex flex-col bg-white rounded-lg shadow overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 gap-2">
        <div class="min-w-0">
          <span class="text-sm font-semibold text-gray-700">코드 — {group ? `${group.name} (${group.groupCode})` : isNewGroupSelected ? '새 그룹 (저장 후 입력)' : '-'}</span>
          {#if group?.isSystem}
            <p class="text-xs text-amber-600">시스템 코드 — 표시명·순서·설명만 고칠 수 있습니다.</p>
          {:else if group?.description}
            <p class="text-xs text-gray-400 truncate">{group.description}</p>
          {/if}
        </div>
        <div class="flex gap-2 shrink-0">
          <UiButton label="행 추가" color={BUTTON_COLORS.EMERALD} iconType="add" onclick={addCodeRow} />
          <UiButton label="삭제" color={BUTTON_COLORS.ROSE} iconType="remove" onclick={removeCodes} />
          <UiButton label="저장" color={BUTTON_COLORS.BLUE} iconType="save" onclick={saveCodes} />
        </div>
      </div>
      <div class="flex-1 min-h-0 relative"><div bind:this={codeEl} class="absolute inset-0"></div></div>
    </section>
  </div>
</div>
