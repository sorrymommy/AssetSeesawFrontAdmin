<script>
  /**
   * 포트폴리오 관리 [구현]
   * 목록 기본 / 등록·수정 팝업 / [계좌 연결관리] 버튼 → 팝업
   * API: portfolioApi (/portfolios CRUD, /portfolios/{id}/accounts)
   */
  import { tick } from 'svelte';
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { portfolioApi } from '$lib/api/portfolioApi';

  const columns = [
    { header: '이름', name: 'name', sortable: true },
    { header: '설명', name: 'description', minWidth: 240 },
    { header: '활성', name: 'isActive', align: 'center', width: 80, formatter: (/** @type {any} */ { value }) => (value ? 'Y' : 'N') },
    { header: '생성일', name: 'createdAt', align: 'center', sortable: true, formatter: (/** @type {any} */ { value }) => (value ? String(value).slice(0, 10) : '') }
  ];

  /** @type {any} */
  let grid;
  let isEditOpen = $state(false);
  let isLinkOpen = $state(false);
  /** @type {number|null} 수정 대상 id (null = 신규) */
  let editingId = $state(null);
  let form = $state({ name: '', description: '', isActive: true });

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
      const list = await portfolioApi.list();
      grid?.resetData(list ?? []);
    } catch (error) {
      console.error('Failed to load portfolios:', error);
      alert(`포트폴리오 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  function openAdd() {
    editingId = null;
    form = { name: '', description: '', isActive: true };
    isEditOpen = true;
  }
  /** @param {any} row */
  function openEdit(row) {
    editingId = row.portfolioId;
    form = { name: row.name ?? '', description: row.description ?? '', isActive: row.isActive ?? true };
    isEditOpen = true;
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
    try {
      // accountIds 생략(null) = 계좌 귀속 변경 없음
      if (editingId === null) {
        await portfolioApi.create({ name, description });
      } else {
        await portfolioApi.update(editingId, { name, description, isActive: form.isActive });
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
    { label: '계좌 연결관리', color: BUTTON_COLORS.PURPLE, onClick: () => (isLinkOpen = true) },
    { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: removeChecked }
  ];
</script>

<StandardListPage title="포트폴리오 관리" {columns} {actions} onReady={handleReady} onRowDblClick={openEdit}>
  <Modal bind:isOpen={isEditOpen} title={editingId === null ? '포트폴리오 등록' : '포트폴리오 수정'} onSave={save}>
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
  </Modal>

  <Modal bind:isOpen={isLinkOpen} title="계좌 연결관리" width="max-w-lg" onSave={() => { /* TODO: 계좌 연결 동기화 (update accountIds) */ }}>
    <p class="text-sm text-gray-500">이 포트폴리오에 연결할 계좌를 선택합니다. (한 계좌는 동시에 하나의 포트폴리오에만 귀속)</p>
    <div class="border border-gray-200 rounded-md p-3 text-sm text-gray-400 min-h-[120px] flex items-center justify-center">
      계좌 선택 목록 (연동 예정)
    </div>
  </Modal>
</StandardListPage>
