<script>
  /**
   * 배당조회 [구현] — 마스터(종목별 배당 합계)·디테일(선택한 종목의 배당 기록) 그리드
   * - 조회조건: 계좌(다중 선택, 비우면 전체), 기간(시작일~종료일, 기본 올해), 종목(비우면 전체)
   * - 마스터: 기간 내 배당(DIVIDEND) 거래를 종목·통화별로 합산 — 건수, 배당금(세전), 세금(원천징수), 세후(= 배당금 - 세금)
   * - 디테일: 마스터에서 고른 종목의 배당 기록 (배당일 내림차순)
   * - 종목 없이 입력한 배당은 '(종목 미지정)'으로 묶는다
   * API: transactionApi.list(txType=DIVIDEND, accountId, stockId, from, to), accountApi.list, stockApi.list
   */
  import { onMount, onDestroy } from 'svelte';
  import 'tui-grid/dist/tui-grid.css';
  import UiButton from '$lib/components/controls/Button.svelte';
  import MultiSelectComboBox from '$lib/components/controls/MultiSelectComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { transactionApi } from '$lib/api/transactionApi';
  import { accountApi } from '$lib/api/accountApi';
  import { stockApi } from '$lib/api/stockApi';

  /** @param {any} v */
  const num = (v) => (v === null || v === undefined || v === '' ? '' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 2 }));
  const numFormatter = (/** @type {any} */ { value }) => num(value);
  /** @param {any} v 합계 행 */
  const sumTemplate = (v) => `<div class="text-right font-semibold">${num(v.sum)}</div>`;

  const masterColumns = [
    { header: '종목', name: 'stockLabel', minWidth: 160, sortable: true },
    { header: '건수', name: 'count', align: 'right', width: 60, sortable: true },
    { header: '배당금', name: 'amount', align: 'right', width: 110, sortable: true, formatter: numFormatter },
    { header: '세금', name: 'tax', align: 'right', width: 90, formatter: numFormatter },
    { header: '세후', name: 'net', align: 'right', width: 110, sortable: true, formatter: numFormatter },
    { header: '통화', name: 'currency', align: 'center', width: 60 }
  ];

  const detailColumns = [
    { header: '배당일', name: 'txDate', align: 'center', width: 110, sortable: true },
    { header: '계좌', name: 'accountName', minWidth: 130 },
    { header: '배당금', name: 'amount', align: 'right', width: 120, formatter: numFormatter },
    { header: '세금', name: 'tax', align: 'right', width: 100, formatter: numFormatter },
    { header: '세후', name: 'net', align: 'right', width: 120, formatter: numFormatter },
    { header: '통화', name: 'currency', align: 'center', width: 70 },
    { header: '비고', name: 'note', minWidth: 160 }
  ];

  /** 합계 행 (금액 컬럼 합) @param {string} labelColumn */
  const summaryFor = (labelColumn) => ({
    height: 36,
    position: 'bottom',
    columnContent: {
      [labelColumn]: { template: () => '<span class="font-semibold">합계</span>' },
      amount: { template: sumTemplate },
      tax: { template: sumTemplate },
      net: { template: sumTemplate }
    }
  });

  /** @type {HTMLElement} */
  let masterEl;
  /** @type {HTMLElement} */
  let detailEl;
  /** @type {any} */
  let masterGrid;
  /** @type {any} */
  let detailGrid;
  /** @type {ResizeObserver | undefined} */
  let resizeObserver;

  /** @type {any[]} */
  let accounts = $state([]);
  const accountOptions = $derived(accounts.map((a) => ({ value: String(a.accountId), label: `${a.name}-${a.accountNumber}${a.isActive ? '' : ' · 비활성'}` })));
  /** @type {any[]} 전체 종목 (상장폐지 포함 — 과거 배당 종목명 표시·선택용) */
  let stocks = $state([]);
  /** @type {Map<number, any>} */
  const stockById = $derived(new Map(stocks.map((s) => [s.stockId, s])));

  const thisYear = new Date().getFullYear();
  let filter = $state({ from: `${thisYear}-01-01`, to: today(), stock: '' });
  /** @type {string[]} 선택한 계좌 ID (비우면 전체) */
  let accountIds = $state([]);

  /** @type {Record<string, any[]>} 마스터 행 키 → 배당 기록 */
  let recordsByKey = {};
  /** 디테일에 표시 중인 마스터 행 */
  let selected = $state(/** @type {any} */ (null));

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  /** @param {any} s */
  function stockLabel(s) {
    return `${s.ticker} ${s.name}`;
  }

  /**
   * 입력값 → 종목. 목록에서 고른 "티커 종목명" 외에 티커·종목명을 정확히 입력한 경우도 받는다 (상장폐지 종목 포함).
   * @param {string} query
   */
  function resolveStock(query) {
    const q = query.trim();
    if (!q) return undefined;
    const byLabel = stocks.find((s) => stockLabel(s) === q);
    if (byLabel) return byLabel;
    const matches = stocks.filter((s) => s.ticker === q || s.name === q);
    return matches.length === 1 ? matches[0] : undefined;
  }

  // ==================== 그리드 생성 ====================

  onMount(async () => {
    const { default: Grid } = await import('tui-grid');
    /** @type {any} 두 그리드 공통 옵션 */
    const common = { data: [], scrollX: true, scrollY: true, bodyHeight: 'fitToParent', rowHeaders: ['rowNum'], columnOptions: { resizable: true } };
    masterGrid = new Grid({ ...common, el: masterEl, columns: masterColumns, summary: summaryFor('stockLabel') });
    detailGrid = new Grid({ ...common, el: detailEl, columns: detailColumns, summary: summaryFor('txDate') });

    // 종목 행을 고르면 그 종목의 배당 기록을 디테일에
    masterGrid.on('focusChange', (/** @type {any} */ ev) => {
      if (ev.rowKey === ev.prevRowKey || ev.rowKey === null || ev.rowKey === undefined) return;
      showDetail(masterGrid.getRow(ev.rowKey));
    });

    // 숨김 탭에서 그려진 그리드를 다시 보일 때 바로잡는다 (창 크기 변경도 함께 잡힘)
    resizeObserver = new ResizeObserver(refreshLayout);
    resizeObserver.observe(masterEl);
    resizeObserver.observe(detailEl);

    try {
      const [accountList, stockList] = await Promise.all([accountApi.list(), stockApi.list()]);
      accounts = accountList ?? [];
      stocks = stockList ?? [];
    } catch (error) {
      console.error('Failed to load master data:', error);
      alert(`계좌·종목 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
      return;
    }
    await loadDividends();
  });

  onDestroy(() => {
    masterGrid?.destroy();
    detailGrid?.destroy();
    resizeObserver?.disconnect();
  });

  function refreshLayout() {
    // 숨김 상태(크기 0)에서는 계산하지 않는다
    if (!masterEl?.offsetWidth) return;
    masterGrid?.refreshLayout();
    detailGrid?.refreshLayout();
  }

  // ==================== 조회 ====================

  async function loadDividends() {
    if (filter.from && filter.to && filter.from > filter.to) {
      alert('시작일이 종료일보다 늦습니다.');
      return;
    }
    let stockId;
    if (filter.stock.trim()) {
      const stock = resolveStock(filter.stock);
      if (!stock) {
        alert('종목을 찾을 수 없습니다. 목록에서 선택하거나 티커를 정확히 입력하세요.');
        return;
      }
      stockId = stock.stockId;
    }

    try {
      // API는 계좌 하나만 받는다 — 하나면 API에서, 둘 이상이면 전체를 받아 여기서 거른다
      const accountId = accountIds.length === 1 ? accountIds[0] : undefined;
      const fetched = (await transactionApi.list({ txType: 'DIVIDEND', accountId, stockId, from: filter.from, to: filter.to })) ?? [];
      const list = accountIds.length > 1 ? fetched.filter((/** @type {any} */ t) => accountIds.includes(String(t.accountId))) : fetched;
      const accountName = new Map(accounts.map((a) => [a.accountId, a.name]));

      // 종목·통화별로 묶는다 (통화가 다르면 합산하지 않는다)
      recordsByKey = {};
      /** @type {Record<string, any>} */
      const masters = {};
      for (const t of list) {
        const key = `${t.stockId ?? 'none'}|${t.currency}`;
        const amount = Number(t.amount ?? 0);
        const tax = Number(t.tax ?? 0);
        const record = { ...t, accountName: accountName.get(t.accountId) ?? t.accountId, amount, tax, net: amount - tax };
        (recordsByKey[key] ??= []).push(record);
        const stock = t.stockId ? stockById.get(t.stockId) : null;
        const m = (masters[key] ??= {
          key,
          stockId: t.stockId,
          stockLabel: t.stockId ? (stock ? stockLabel(stock) : String(t.stockId)) : '(종목 미지정)',
          currency: t.currency,
          count: 0,
          amount: 0,
          tax: 0,
          net: 0
        });
        m.count += 1;
        m.amount += amount;
        m.tax += tax;
        m.net += amount - tax;
      }

      // 세후 금액이 큰 종목부터, 종목 미지정은 맨 뒤
      const rows = Object.values(masters).sort((a, b) => Number(a.stockId == null) - Number(b.stockId == null) || b.net - a.net);
      masterGrid.resetData(rows);
      const keep = rows.find((r) => r.key === selected?.key) ?? rows[0] ?? null;
      showDetail(keep);
      const row = masterGrid.getData().find((/** @type {any} */ r) => r.key === keep?.key);
      if (row) masterGrid.focus(row.rowKey, 'stockLabel');
      setTimeout(refreshLayout, 50);
    } catch (error) {
      console.error('Failed to load dividends:', error);
      alert(`배당 내역을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  /** @param {any} row 마스터 행 (없으면 비움) */
  function showDetail(row) {
    selected = row;
    detailGrid?.resetData(row ? (recordsByKey[row.key] ?? []).map((r) => ({ ...r })) : []);
  }

  const filterInputClass = 'block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border';
</script>

<div class="absolute inset-0 flex flex-col p-4 gap-3">
  <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
    <form class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-4 items-end" onsubmit={(e) => { e.preventDefault(); loadDividends(); }}>
      <MultiSelectComboBox id="dv-account" label="계좌" options={accountOptions} bind:value={accountIds} placeholder="전체" />
      <div>
        <label for="dv-from" class="block text-xs font-medium text-gray-700 mb-1">시작일</label>
        <input id="dv-from" type="date" bind:value={filter.from} class={filterInputClass} />
      </div>
      <div>
        <label for="dv-to" class="block text-xs font-medium text-gray-700 mb-1">종료일</label>
        <input id="dv-to" type="date" bind:value={filter.to} class={filterInputClass} />
      </div>
      <div class="sm:col-span-1 lg:col-span-2">
        <label for="dv-stock" class="block text-xs font-medium text-gray-700 mb-1">종목</label>
        <input id="dv-stock" type="text" list="dv-stock-list" bind:value={filter.stock} placeholder="전체 (티커 또는 종목명)" class={filterInputClass} />
      </div>
      <div class="sm:col-span-2 lg:col-span-2 text-xs text-gray-400">
        기간 내 배당을 종목별로 합산합니다. 계좌·종목을 비우면 전체. 세후 = 배당금 - 세금(원천징수).
      </div>
      <button type="submit" class="hidden" aria-hidden="true" tabindex="-1"></button>
    </form>
  </div>

  <datalist id="dv-stock-list">
    {#each stocks as s (s.stockId)}<option value={stockLabel(s)}></option>{/each}
  </datalist>

  <div class="flex items-center justify-between">
    <h2 class="text-sm font-semibold text-gray-700">배당조회</h2>
    <UiButton label="Search" color={BUTTON_COLORS.INDIGO} iconType="search" onclick={loadDividends} />
  </div>

  <div class="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
    <!-- 마스터: 종목별 배당 합계 -->
    <section class="lg:w-1/2 min-h-[240px] flex-1 lg:flex-none flex flex-col bg-white rounded-lg shadow overflow-hidden">
      <div class="px-3 py-2 border-b border-gray-100">
        <span class="text-sm font-semibold text-gray-700">종목별 배당 합계</span>
      </div>
      <div class="flex-1 min-h-0 relative"><div bind:this={masterEl} class="absolute inset-0"></div></div>
    </section>

    <!-- 디테일: 선택한 종목의 배당 기록 -->
    <section class="lg:w-1/2 min-h-[240px] flex-1 lg:flex-none flex flex-col bg-white rounded-lg shadow overflow-hidden">
      <div class="px-3 py-2 border-b border-gray-100">
        <span class="text-sm font-semibold text-gray-700">배당 기록 — {selected?.stockLabel ?? '-'}</span>
      </div>
      <div class="flex-1 min-h-0 relative"><div bind:this={detailEl} class="absolute inset-0"></div></div>
    </section>
  </div>
</div>
