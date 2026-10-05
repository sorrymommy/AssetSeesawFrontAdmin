<script>
  /**
   * 사용자 관리 [구현][ADMIN]
   * 목록·검색(이메일·이름, 역할, 상태) / [Add] 사용자 등록 팝업 / 그리드에서 역할·상태를 고른 뒤 [Save]로 바뀐 행만 저장
   * - 본인 행은 잠금 (관리자 권한 해제·비활성화로 스스로 잠기는 것 방지 — 서버도 거부)
   * - 역할 변경은 대상 사용자가 다시 로그인해야 반영. 활성이 아니면 로그인 불가
   * - [비밀번호 초기화] 체크한 사용자에게 임시 비밀번호 발급(한 번만 표시) → 다음 로그인 시 변경 강제. 본인은 제외
   * API: userApi.list / create / update / resetPassword
   */
  import { tick } from 'svelte';
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { authStore } from '$lib/stores/authStore';
  import { userApi } from '$lib/api/userApi';
  import { codes, loadCodes, codeName, codeOptions, CODE_GROUP } from '$lib/stores/codeStore';
  import { kstDateFormatter } from '$lib/utils/date';

  /** 역할·상태 select 목록은 공통 코드라 코드를 불러온 뒤 컬럼을 다시 만든다 @param {string} group */
  const listItems = (group) => codeOptions($codes, group, { includeInactive: true }).map((o) => ({ text: o.label, value: o.value }));
  const roleOptions = $derived(codeOptions($codes, CODE_GROUP.USER_ROLE, { includeInactive: true }));
  const statusOptions = $derived(codeOptions($codes, CODE_GROUP.USER_STATUS, { includeInactive: true }));

  const buildColumns = () => [
    { header: '이메일', name: 'email', minWidth: 220, sortable: true },
    { header: '이름', name: 'displayName', minWidth: 140, sortable: true },
    {
      header: '역할 (더블클릭하여 선택)',
      name: 'role',
      align: 'center',
      width: 170,
      formatter: 'listItemText',
      editor: { type: 'select', options: { instantApply: true, listItems: listItems(CODE_GROUP.USER_ROLE) } }
    },
    {
      header: '상태 (더블클릭하여 선택)',
      name: 'status',
      align: 'center',
      width: 170,
      formatter: 'listItemText',
      editor: { type: 'select', options: { instantApply: true, listItems: listItems(CODE_GROUP.USER_STATUS) } }
    },
    { header: '비밀번호', name: 'mustChangePassword', align: 'center', width: 100, formatter: (/** @type {any} */ { value }) => (value ? '변경 필요' : '') },
    { header: '가입일', name: 'createdAt', align: 'center', width: 110, sortable: true, formatter: kstDateFormatter },
    { header: '수정일', name: 'updatedAt', align: 'center', width: 110, formatter: kstDateFormatter }
  ];

  /** @type {any} */
  let grid;
  let filter = $state({ query: '', role: '', status: '' });

  let isAddOpen = $state(false);
  let form = $state(emptyForm());

  function emptyForm() {
    return { email: '', name: '', password: '', passwordConfirm: '', role: 'USER' };
  }
  const myUserId = $derived($authStore?.user?.userId);

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  /** @returns {any[]} 역할·상태가 바뀐 행 (저장 대상) */
  function changedRows() {
    const updated = /** @type {any[]} */ (grid?.getModifiedRows()?.updatedRows ?? []);
    return updated.filter((r) => r.role !== r.originalRole || r.status !== r.originalStatus);
  }

  /** @param {any} g */
  async function handleReady(g) {
    grid = g;
    try {
      await loadCodes();
      grid.setColumns(buildColumns());
    } catch (error) {
      console.error('Failed to load codes:', error);
    }
    loadUsers();
  }

  async function loadUsers() {
    try {
      const list = (await userApi.list({ query: filter.query.trim(), role: filter.role, status: filter.status })) ?? [];
      grid?.resetData(
        list.map((/** @type {any} */ u) => ({
          ...u,
          displayName: u.userId === myUserId ? `${u.name} (나)` : u.name,
          originalRole: u.role,
          originalStatus: u.status
        }))
      );
      // 본인 행은 편집 불가
      const mine = grid?.getData().find((/** @type {any} */ r) => r.userId === myUserId);
      if (mine) grid.disableRow(mine.rowKey);
    } catch (error) {
      console.error('Failed to load users:', error);
      alert(`사용자 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  function handleSearch() {
    grid?.finishEditing();
    const n = changedRows().length;
    if (n > 0 && !confirm(`저장하지 않은 변경 ${n}건이 있습니다. 무시하고 조회할까요?`)) return;
    loadUsers();
  }

  async function save() {
    grid?.finishEditing();
    const rows = changedRows();
    if (rows.length === 0) {
      alert('변경된 사용자가 없습니다.');
      return;
    }
    const lines = rows.map(
      (r) => {
        const label = (/** @type {string} */ role, /** @type {string} */ status) =>
          `${codeName($codes, CODE_GROUP.USER_ROLE, role)}/${codeName($codes, CODE_GROUP.USER_STATUS, status)}`;
        return `${r.email}: ${label(r.originalRole, r.originalStatus)} → ${label(r.role, r.status)}`;
      }
    );
    if (!confirm(`다음 ${rows.length}명의 역할·상태를 변경할까요?\n${lines.join('\n')}`)) return;

    /** @type {string[]} */
    const failures = [];
    for (const row of rows) {
      try {
        await userApi.update(row.userId, { role: row.role, status: row.status });
      } catch (error) {
        failures.push(`${row.email}: ${errorMessage(error)}`);
      }
    }
    if (failures.length > 0) alert(`일부 사용자를 저장하지 못했습니다.\n${failures.join('\n')}`);
    await loadUsers();
  }

  function openAdd() {
    form = emptyForm();
    isAddOpen = true;
  }

  /** 검증 실패 시 Modal이 닫힌 뒤 다시 연다 @param {string} message */
  async function reject(message) {
    alert(message);
    await tick();
    isAddOpen = true;
  }

  async function create() {
    const email = form.email.trim();
    const name = form.name.trim();
    if (!email || !name) return reject('이메일과 이름을 입력하세요.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reject('이메일 형식이 올바르지 않습니다.');
    if (form.password.length < 8) return reject('비밀번호는 8자 이상이어야 합니다.');
    if (form.password !== form.passwordConfirm) return reject('비밀번호 확인이 일치하지 않습니다.');

    try {
      await userApi.create({ email, name, password: form.password, role: form.role });
      form = emptyForm(); // 비밀번호를 화면 상태에 남기지 않는다
      await loadUsers();
    } catch (error) {
      console.error('Failed to create user:', error);
      alert(`등록에 실패했습니다.
${errorMessage(error)}`);
      isAddOpen = true; // 입력값을 유지한 채 팝업을 다시 연다
    }
  }

  // ==================== 비밀번호 초기화 ====================

  let isResetResultOpen = $state(false);
  /** @type {Array<{email:string, temporaryPassword:string}>} 발급한 임시 비밀번호 (팝업을 닫으면 지운다) */
  let resetResults = $state([]);
  let copiedEmail = $state('');

  async function resetPasswords() {
    grid?.finishEditing();
    const rows = /** @type {any[]} */ (grid?.getCheckedRows() ?? []);
    if (rows.length === 0) return alert('비밀번호를 초기화할 사용자를 체크하세요.');
    if (rows.some((r) => r.userId === myUserId)) return alert('본인 계정은 초기화할 수 없습니다. 내 정보에서 비밀번호를 변경하세요.');
    if (!confirm(`다음 ${rows.length}명의 비밀번호를 임시 비밀번호로 초기화할까요?\n${rows.map((r) => r.email).join('\n')}\n\n기존 비밀번호로는 더 이상 로그인할 수 없고, 다음 로그인 때 새 비밀번호를 정해야 합니다.`)) return;

    /** @type {Array<{email:string, temporaryPassword:string}>} */
    const results = [];
    /** @type {string[]} */
    const failures = [];
    for (const row of rows) {
      try {
        const res = await userApi.resetPassword(row.userId);
        results.push({ email: res.email, temporaryPassword: res.temporaryPassword });
      } catch (error) {
        failures.push(`${row.email}: ${errorMessage(error)}`);
      }
    }
    if (failures.length > 0) alert(`일부 사용자를 초기화하지 못했습니다.\n${failures.join('\n')}`);
    if (results.length > 0) {
      resetResults = results;
      copiedEmail = '';
      isResetResultOpen = true;
    }
    await loadUsers();
  }

  /** @param {{email:string, temporaryPassword:string}} r */
  async function copyPassword(r) {
    try {
      await navigator.clipboard.writeText(r.temporaryPassword);
      copiedEmail = r.email;
    } catch {
      alert('클립보드에 복사하지 못했습니다. 직접 선택해 복사하세요.');
    }
  }

  // 팝업을 닫으면 임시 비밀번호를 화면 상태에서 지운다
  $effect(() => {
    if (!isResetResultOpen) resetResults = [];
  });

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: handleSearch },
    { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
    { label: 'Save', color: BUTTON_COLORS.BLUE, iconType: 'save', onClick: save },
    { label: '비밀번호 초기화', color: BUTTON_COLORS.AMBER, onClick: resetPasswords }
  ];

  const inputClass = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const filterInputClass = 'block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border';
</script>

<StandardListPage title="사용자 관리" columns={buildColumns()} {actions} onReady={handleReady}>
  {#snippet filters()}
    <form class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end" onsubmit={(e) => { e.preventDefault(); handleSearch(); }}>
      <div class="sm:col-span-2">
        <label for="us-query" class="block text-xs font-medium text-gray-700 mb-1">이메일·이름</label>
        <input id="us-query" type="text" bind:value={filter.query} placeholder="검색어" class={filterInputClass} />
      </div>
      <LookupComboBox id="us-role" label="역할" options={roleOptions} bind:value={filter.role} placeholder="전체" />
      <LookupComboBox id="us-status" label="상태" options={statusOptions} bind:value={filter.status} placeholder="전체" />
      <div class="sm:col-span-3 lg:col-span-2 text-xs text-gray-400">
        역할·상태 셀을 더블클릭해 고른 뒤 [Save]. 본인 계정은 변경할 수 없습니다. 역할 변경은 다음 로그인부터 적용됩니다.
        로그인이 안 되는 사용자는 체크 후 [비밀번호 초기화].
      </div>
      <button type="submit" class="hidden" aria-hidden="true" tabindex="-1"></button>
    </form>
  {/snippet}

  <Modal bind:isOpen={isAddOpen} title="사용자 등록" onSave={create}>
    <div>
      <label for="uf-email" class={labelClass}>이메일 (로그인 ID)</label>
      <input id="uf-email" type="email" maxlength="255" autocomplete="off" bind:value={form.email} class={inputClass} />
    </div>
    <div>
      <label for="uf-name" class={labelClass}>이름</label>
      <input id="uf-name" type="text" maxlength="50" bind:value={form.name} class={inputClass} />
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="uf-pw" class={labelClass}>초기 비밀번호</label>
        <input id="uf-pw" type="password" maxlength="100" autocomplete="new-password" bind:value={form.password} placeholder="8자 이상" class={inputClass} />
      </div>
      <div>
        <label for="uf-pw2" class={labelClass}>비밀번호 확인</label>
        <input id="uf-pw2" type="password" maxlength="100" autocomplete="new-password" bind:value={form.passwordConfirm} class={inputClass} />
      </div>
    </div>
    <div>
      <label for="uf-role" class={labelClass}>역할</label>
      <select id="uf-role" bind:value={form.role} class={inputClass}>
        {#each roleOptions as o (o.value)}
          <option value={o.value}>{o.label}</option>
        {/each}
      </select>
    </div>
    <p class="text-xs text-gray-400">등록한 사용자는 활성 상태로 만들어집니다. 초기 비밀번호는 사용자에게 따로 전달하세요.</p>
  </Modal>

  <Modal bind:isOpen={isResetResultOpen} title="임시 비밀번호 발급" width="max-w-lg">
    <p class="text-sm text-amber-600">임시 비밀번호는 지금 한 번만 표시됩니다. 사용자에게 전달하세요. 사용자는 이 비밀번호로 로그인한 뒤 바로 새 비밀번호를 정해야 합니다.</p>
    <table class="w-full text-sm border border-gray-200 rounded-md">
      <thead class="bg-gray-50 text-gray-600">
        <tr><th class="text-left p-2">이메일</th><th class="text-left p-2">임시 비밀번호</th><th class="w-20"></th></tr>
      </thead>
      <tbody>
        {#each resetResults as r (r.email)}
          <tr class="border-t border-gray-100">
            <td class="p-2">{r.email}</td>
            <td class="p-2 font-mono select-all">{r.temporaryPassword}</td>
            <td class="p-2 text-right">
              <button type="button" onclick={() => copyPassword(r)} class="text-xs font-medium text-indigo-600 hover:text-indigo-800">
                {copiedEmail === r.email ? '복사됨' : '복사'}
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </Modal>
</StandardListPage>
