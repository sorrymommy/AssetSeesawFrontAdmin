<script>
  /**
   * 종목 관리 [구현 / 일부 ADMIN]
   * 목록 / 등록·삭제 팝업 (등록·수정·삭제는 ADMIN 전용)
   * API: stockApi (GET 전체, POST/PUT ADMIN)
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { authStore } from '$lib/stores/authStore';

  const isAdmin = $derived($authStore?.user?.role === 'ADMIN');

  const columns = [
    { header: '티커', name: 'ticker', sortable: true },
    { header: '종목명', name: 'name', sortable: true, minWidth: 180 },
    { header: '시장', name: 'market', align: 'center', width: 100 },
    { header: '통화', name: 'currency', align: 'center', width: 80 },
    { header: '활성', name: 'isActive', align: 'center', width: 80 }
  ];

  let isOpen = $state(false);
  let form = $state({ ticker: '', name: '', market: '', currency: 'KRW', isActive: true });

  function openAdd() {
    form = { ticker: '', name: '', market: '', currency: 'KRW', isActive: true };
    isOpen = true;
  }
  /** @param {any} row */
  function openEdit(row) {
    form = { ticker: row.ticker ?? '', name: row.name ?? '', market: row.market ?? '', currency: row.currency ?? 'KRW', isActive: row.isActive ?? true };
    isOpen = true;
  }

  // ADMIN만 등록/삭제 버튼 노출
  const actions = $derived([
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: () => {} },
    ...(isAdmin
      ? [
          { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
          { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: () => {} }
        ]
      : [])
  ]);
</script>

<StandardListPage title="종목 관리" {columns} data={[]} {actions} onRowDblClick={(/** @type {any} */ row) => isAdmin && openEdit(row)}>
  <Modal bind:isOpen title="종목 등록/수정" onSave={() => { /* TODO: stockApi.create/update (ADMIN) */ }}>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="st-ticker" class="block text-sm font-medium text-gray-700 mb-1">티커</label>
        <input id="st-ticker" type="text" bind:value={form.ticker} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
      </div>
      <div>
        <label for="st-cur" class="block text-sm font-medium text-gray-700 mb-1">통화</label>
        <input id="st-cur" type="text" bind:value={form.currency} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
      </div>
    </div>
    <div>
      <label for="st-name" class="block text-sm font-medium text-gray-700 mb-1">종목명</label>
      <input id="st-name" type="text" bind:value={form.name} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
    </div>
    <div>
      <label for="st-market" class="block text-sm font-medium text-gray-700 mb-1">시장</label>
      <input id="st-market" type="text" bind:value={form.market} placeholder="KOSPI / NASDAQ ..." class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
    </div>
    <label class="inline-flex items-center gap-2 cursor-pointer">
      <input type="checkbox" bind:checked={form.isActive} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
      <span class="text-sm text-gray-700">활성</span>
    </label>
  </Modal>
</StandardListPage>
