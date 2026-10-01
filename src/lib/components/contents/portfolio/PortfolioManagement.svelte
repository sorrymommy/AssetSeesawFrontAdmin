<script>
  /**
   * 포트폴리오 관리 [구현]
   * 목록 기본 / 등록·수정 팝업 (계좌 연결 포함)
   * API: portfolioApi (/portfolios CRUD, /portfolios/{id}/accounts)
   */
  import { tick } from 'svelte';
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { portfolioApi } from '$lib/api/portfolioApi';
  import { accountApi } from '$lib/api/accountApi';

  const columns = [
    { header: '이름', name: 'name', sortable: true },
    { header: '설명', name: 'description', minWidth: 240 },
    { header: '연결 계좌수', name: 'accountCount', align: 'center', width: 110 },
    { header: '활성', name: 'isActive', align: 'center', width: 80, formatter: (/** @type {any} */ { value }) => (value ? 'Y' : 'N') },
    { header: '생성일', name: 'createdAt', align: 'center', sortable: true, formatter: (/** @type {any} */ { value }) => (value ? String(value).slice(0, 10) : '') }
  ];

  /** @type {any} */
  let grid;
  let isEditOpen = $state(false);
  /** @type {number|null} 수정 대상 id (null = 신규) */
  let editingId = $state(null);
  let form = $state({ name: '', description: '', isActive: true });

  /** @type {any[]} 목록의 포트폴리오 (현재 귀속 계좌 id 포함) */
  let portfolios = [];
  /** @type {Array<{accountId:number, label:string, isActive:boolean, linkedTo:string|null, checked:boolean}>} 등록·수정 팝업의 계좌 선택 목록 */
  let accountChoices = $state([]);

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  /** @param {any} g */
  function handleReady(g) {
    grid = g;
    loadPortfolios();
  }

  async function loadPortfolios() {
    try {
      const list = (await portfolioApi.list()) ?? [];
      // 포트폴리오별 현재 귀속 계좌 (end_date 없는 연결) — 연결 계좌수 표시와 연결관리 팝업에 쓴다
      portfolios = await Promise.all(
        list.map(async (/** @type {any} */ p) => {
          const links = (await portfolioApi.accounts(p.portfolioId)) ?? [];
          const accountIds = links.filter((/** @type {any} */ l) => !l.endDate).map((/** @type {any} */ l) => l.accountId);
          return { ...p, accountIds, accountCount: accountIds.length };
        })
      );
      grid?.resetData(portfolios);
    } catch (error) {
      console.error('Failed to load portfolios:', error);
      alert(`포트폴리오 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  /**
   * 계좌 선택 목록을 만든다. 현재 포트폴리오에 귀속된 계좌는 체크, 다른 포트폴리오에 귀속된 계좌는 선택 불가.
   * @param {number|null} portfolioId 수정 대상 (신규면 null)
   */
  async function loadAccountChoices(portfolioId) {
    const accounts = (await accountApi.list()) ?? [];
    const own = portfolios.find((p) => p.portfolioId === portfolioId)?.accountIds ?? [];
    /** @type {Record<number, string>} 다른 포트폴리오에 귀속 중인 계좌 → 포트폴리오명 */
    const linkedElsewhere = {};
    for (const p of portfolios) {
      if (p.portfolioId === portfolioId) continue;
      for (const id of p.accountIds) linkedElsewhere[id] = p.name;
    }
    accountChoices = accounts.map((/** @type {any} */ a) => ({
      accountId: a.accountId,
      label: `${a.name} (${a.broker} ${a.accountNumber})`,
      isActive: a.isActive,
      linkedTo: linkedElsewhere[a.accountId] ?? null,
      checked: own.includes(a.accountId)
    }));
  }

  /** @param {number|null} portfolioId */
  async function openForm(portfolioId) {
    try {
      await loadAccountChoices(portfolioId);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      alert(`계좌 목록을 불러오지 못했습니다.
${errorMessage(error)}`);
      return;
    }
    isEditOpen = true;
  }

  function openAdd() {
    editingId = null;
    form = { name: '', description: '', isActive: true };
    openForm(null);
  }
  /** @param {any} row */
  function openEdit(row) {
    editingId = row.portfolioId;
    form = { name: row.name ?? '', description: row.description ?? '', isActive: row.isActive ?? true };
    openForm(row.portfolioId);
  }

  async function save() {
    const name = form.name.trim();
    if (!name) {
      alert('이름을 입력하세요.');
      await tick(); // Modal이 onSave 호출 직후 닫으므로, 닫힌 뒤 다시 연다
      isEditOpen = true;
      return;
    }
    const description = form.description.trim() || null;
    // 체크된 계좌로 귀속 동기화 — 해제한 계좌는 오늘로 종료, 새로 체크한 계좌는 오늘부터 귀속
    const accountIds = accountChoices.filter((a) => a.checked).map((a) => a.accountId);
    try {
      if (editingId === null) {
        await portfolioApi.create({ name, description, accountIds });
      } else {
        await portfolioApi.update(editingId, { name, description, isActive: form.isActive, accountIds });
      }
      await loadPortfolios();
    } catch (error) {
      console.error('Failed to save portfolio:', error);
      alert(`저장에 실패했습니다.\n${errorMessage(error)}`);
      isEditOpen = true; // 입력값을 유지한 채 팝업을 다시 연다
    }
  }

  async function removeChecked() {
    const rows = grid?.getCheckedRows() ?? [];
    if (rows.length === 0) {
      alert('삭제할 포트폴리오를 선택하세요.');
      return;
    }
    if (!confirm(`선택한 ${rows.length}건을 삭제할까요?\n귀속 중인 계좌 연결은 오늘 날짜로 종료됩니다.`)) return;
    try {
      for (const row of rows) {
        await portfolioApi.remove(row.portfolioId);
      }
    } catch (error) {
      console.error('Failed to remove portfolio:', error);
      alert(`삭제에 실패했습니다.\n${errorMessage(error)}`);
    }
    await loadPortfolios();
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: loadPortfolios },
    { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
    { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: removeChecked }
  ];
</script>

<StandardListPage title="포트폴리오 관리" {columns} {actions} onReady={handleReady} onRowDblClick={openEdit}>
  <Modal bind:isOpen={isEditOpen} title={editingId === null ? '포트폴리오 등록' : '포트폴리오 수정'} width="max-w-lg" onSave={save}>
    <div>
      <label for="pf-name" class="block text-sm font-medium text-gray-700 mb-1">이름</label>
      <input id="pf-name" type="text" maxlength="50" bind:value={form.name} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2" />
    </div>
    <div>
      <label for="pf-desc" class="block text-sm font-medium text-gray-700 mb-1">설명</label>
      <textarea id="pf-desc" bind:value={form.description} rows="3" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"></textarea>
    </div>
    {#if editingId !== null}
      <label class="inline-flex items-center gap-2 cursor-pointer">
        <input type="checkbox" bind:checked={form.isActive} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
        <span class="text-sm text-gray-700">활성</span>
      </label>
    {/if}
    <div>
      <span class="block text-sm font-medium text-gray-700 mb-1">연결 계좌</span>
      <div class="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-60 overflow-y-auto">
        {#each accountChoices as a (a.accountId)}
          <label class="flex items-center gap-3 p-2 text-sm {a.linkedTo ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer'}">
            <input type="checkbox" bind:checked={a.checked} disabled={a.linkedTo !== null} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50" />
            <span class="flex-1">{a.label}{a.isActive ? '' : ' · 비활성'}</span>
            {#if a.linkedTo}
              <span class="text-xs">'{a.linkedTo}'에 연결됨</span>
            {/if}
          </label>
        {:else}
          <p class="p-3 text-sm text-gray-400 text-center">등록된 계좌가 없습니다. 거래·계좌 → 계좌 관리에서 먼저 등록하세요.</p>
        {/each}
      </div>
      <p class="mt-1 text-xs text-gray-400">한 계좌는 동시에 하나의 포트폴리오에만 연결됩니다. 해제한 계좌는 오늘 날짜로 연결이 종료되고, 새로 체크한 계좌는 오늘부터 연결됩니다.</p>
    </div>
  </Modal>

</StandardListPage>
