<script>
  /**
   * 사용자 관리 [구현][ADMIN]
   * 목록·검색(이메일·이름, 역할, 상태) / 그리드에서 역할·상태를 고른 뒤 [Save]로 바뀐 행만 저장
   * - 본인 행은 잠금 (관리자 권한 해제·비활성화로 스스로 잠기는 것 방지 — 서버도 거부)
   * - 역할 변경은 대상 사용자가 다시 로그인해야 반영. 활성이 아니면 로그인 불가
   * API: userApi.list / update
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { authStore } from '$lib/stores/authStore';
  import { userApi, USER_ROLE_LABELS, USER_STATUS_LABELS } from '$lib/api/userApi';

  /** @param {Record<string, string>} labels */
  const toListItems = (labels) => Object.entries(labels).map(([value, text]) => ({ text, value }));
  /** @param {Record<string, string>} labels */
  const toOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));
  const dateFormatter = (/** @type {any} */ { value }) => (value ? String(value).slice(0, 10) : '');

  const columns = [
    { header: '이메일', name: 'email', minWidth: 220, sortable: true },
    { header: '이름', name: 'displayName', minWidth: 140, sortable: true },
    {
      header: '역할 (더블클릭하여 선택)',
      name: 'role',
      align: 'center',
      width: 170,
      formatter: 'listItemText',
      editor: { type: 'select', options: { instantApply: true, listItems: toListItems(USER_ROLE_LABELS) } }
    },
    {
      header: '상태 (더블클릭하여 선택)',
      name: 'status',
      align: 'center',
      width: 170,
      formatter: 'listItemText',
      editor: { type: 'select', options: { instantApply: true, listItems: toListItems(USER_STATUS_LABELS) } }
    },
    { header: '가입일', name: 'createdAt', align: 'center', width: 110, sortable: true, formatter: dateFormatter },
    { header: '수정일', name: 'updatedAt', align: 'center', width: 110, formatter: dateFormatter }
  ];

  /** @type {any} */
  let grid;
  let filter = $state({ query: '', role: '', status: '' });
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
  function handleReady(g) {
    grid = g;
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
      (r) => `${r.email}: ${USER_ROLE_LABELS[r.originalRole]}/${USER_STATUS_LABELS[r.originalStatus]} → ${USER_ROLE_LABELS[r.role]}/${USER_STATUS_LABELS[r.status]}`
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

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: handleSearch },
    { label: 'Save', color: BUTTON_COLORS.BLUE, iconType: 'save', onClick: save }
  ];

  const filterInputClass = 'block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border';
</script>

<StandardListPage title="사용자 관리" {columns} {actions} onReady={handleReady}>
  {#snippet filters()}
    <form class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end" onsubmit={(e) => { e.preventDefault(); handleSearch(); }}>
      <div class="sm:col-span-2">
        <label for="us-query" class="block text-xs font-medium text-gray-700 mb-1">이메일·이름</label>
        <input id="us-query" type="text" bind:value={filter.query} placeholder="검색어" class={filterInputClass} />
      </div>
      <LookupComboBox id="us-role" label="역할" options={toOptions(USER_ROLE_LABELS)} bind:value={filter.role} placeholder="전체" />
      <LookupComboBox id="us-status" label="상태" options={toOptions(USER_STATUS_LABELS)} bind:value={filter.status} placeholder="전체" />
      <div class="sm:col-span-3 lg:col-span-2 text-xs text-gray-400">
        역할·상태 셀을 더블클릭해 고른 뒤 [Save]. 본인 계정은 변경할 수 없습니다. 역할 변경은 다음 로그인부터 적용됩니다.
      </div>
      <button type="submit" class="hidden" aria-hidden="true" tabindex="-1"></button>
    </form>
  {/snippet}
</StandardListPage>
