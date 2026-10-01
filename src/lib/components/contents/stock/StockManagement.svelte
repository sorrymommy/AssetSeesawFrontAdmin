<script>
  /**
   * 종목 관리 [구현 / 일부 ADMIN]
   * 목록 / 등록·수정 팝업 (등록·수정은 ADMIN 전용)
   * API: stockApi (GET 전체, POST/PUT ADMIN)
   * 종목 마스터는 삭제 개념이 없다 — 사용 중지는 수정 팝업의 '활성' 해제로 처리
   */
  import { tick } from 'svelte';
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { authStore } from '$lib/stores/authStore';
  import { stockApi } from '$lib/api/stockApi';

  const isAdmin = $derived($authStore?.user?.role === 'ADMIN');

  const columns = [
    { header: '티커', name: 'ticker', sortable: true },
    { header: '종목명', name: 'name', sortable: true, minWidth: 180 },
    { header: '시장', name: 'market', align: 'center', width: 100 },
    { header: '통화', name: 'currency', align: 'center', width: 80 },
    { header: '활성', name: 'isActive', align: 'center', width: 80, formatter: (/** @type {any} */ { value }) => (value ? 'Y' : 'N') }
  ];

  /** @type {any} */
  let grid;
  let search = $state({ query: '', market: '' });
  let isOpen = $state(false);
  /** @type {number|null} 수정 대상 id (null = 신규) */
  let editingId = $state(null);
  let form = $state({ ticker: '', name: '', market: '', currency: 'KRW', isActive: true });

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  /** @param {any} g */
  function handleReady(g) {
    grid = g;
    loadStocks();
  }

  async function loadStocks() {
    try {
      const list = await stockApi.list({ query: search.query.trim(), market: search.market.trim() });
      grid?.resetData(list ?? []);
    } catch (error) {
      console.error('Failed to load stocks:', error);
      alert(`종목 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  function openAdd() {
    editingId = null;
    form = { ticker: '', name: '', market: '', currency: 'KRW', isActive: true };
    isOpen = true;
  }
  /** @param {any} row */
  function openEdit(row) {
    editingId = row.stockId;
    form = { ticker: row.ticker ?? '', name: row.name ?? '', market: row.market ?? '', currency: row.currency ?? 'KRW', isActive: row.isActive ?? true };
    isOpen = true;
  }

  /** 검증 실패 시 Modal이 닫힌 뒤 다시 연다 @param {string} message */
  async function reject(message) {
    alert(message);
    await tick();
    isOpen = true;
  }

  async function save() {
    const name = form.name.trim();
    try {
      if (editingId === null) {
        const ticker = form.ticker.trim();
        const market = form.market.trim().toUpperCase();
        const currency = form.currency.trim().toUpperCase();
        if (!ticker || !name || !market) return reject('티커·종목명·시장을 입력하세요.');
        if (currency.length !== 3) return reject('통화는 3자리 코드로 입력하세요. (예: KRW, USD)');
        await stockApi.create({ ticker, name, market, currency });
      } else {
        if (!name) return reject('종목명을 입력하세요.');
        await stockApi.update(editingId, { name, isActive: form.isActive });
      }
      await loadStocks();
    } catch (error) {
      console.error('Failed to save stock:', error);
      alert(`저장에 실패했습니다.\n${errorMessage(error)}`);
      isOpen = true; // 입력값을 유지한 채 팝업을 다시 연다
    }
  }

  // ADMIN만 등록 버튼 노출
  const actions = $derived([
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: loadStocks },
    ...(isAdmin ? [{ label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd }] : [])
  ]);
</script>

<StandardListPage title="종목 관리" {columns} {actions} onReady={handleReady} onRowDblClick={(/** @type {any} */ row) => isAdmin && openEdit(row)}>
  {#snippet filters()}
    <form class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4" onsubmit={(e) => { e.preventDefault(); loadStocks(); }}>
      <div class="sm:col-span-2">
        <label for="st-q" class="block text-xs font-medium text-gray-700 mb-1">티커/종목명</label>
        <input id="st-q" type="text" bind:value={search.query} placeholder="예: 005930, 삼성" class="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border" />
      </div>
      <div>
        <label for="st-m" class="block text-xs font-medium text-gray-700 mb-1">시장</label>
        <input id="st-m" type="text" bind:value={search.market} placeholder="KRX / NASDAQ ..." class="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border" />
      </div>
      <button type="submit" class="hidden" aria-hidden="true" tabindex="-1"></button>
    </form>
  {/snippet}

  <Modal bind:isOpen title={editingId === null ? '종목 등록' : '종목 수정'} onSave={save}>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="st-ticker" class="block text-sm font-medium text-gray-700 mb-1">티커</label>
        <input id="st-ticker" type="text" maxlength="20" bind:value={form.ticker} disabled={editingId !== null} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" />
      </div>
      <div>
        <label for="st-cur" class="block text-sm font-medium text-gray-700 mb-1">통화</label>
        <input id="st-cur" type="text" maxlength="3" bind:value={form.currency} disabled={editingId !== null} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" />
      </div>
    </div>
    <div>
      <label for="st-name" class="block text-sm font-medium text-gray-700 mb-1">종목명</label>
      <input id="st-name" type="text" maxlength="100" bind:value={form.name} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
    </div>
    <div>
      <label for="st-market" class="block text-sm font-medium text-gray-700 mb-1">시장</label>
      <input id="st-market" type="text" maxlength="20" bind:value={form.market} disabled={editingId !== null} placeholder="KRX / NASDAQ ..." class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" />
    </div>
    {#if editingId !== null}
      <label class="inline-flex items-center gap-2 cursor-pointer">
        <input type="checkbox" bind:checked={form.isActive} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
        <span class="text-sm text-gray-700">활성 (해제 시 사용 중지)</span>
      </label>
      <p class="text-xs text-gray-400">티커·시장·통화는 등록 후 변경할 수 없습니다.</p>
    {/if}
  </Modal>
</StandardListPage>
