<script>
  /**
   * 계좌잔고 [구현]
   * 계좌 선택 후 [Search] → 보유 종목별 보유수량·매입단가·매입가·평가단가·평가금액·평가손익·수익률,
   * 목록 아래에 주식 평가금액 / 현금잔고 / 계좌 평가금액(주식 + 현금)
   * (화면을 열거나 계좌를 바꿔도 자동으로 조회하지 않는다)
   * - 매입단가는 이동평균(매도 시 평단 유지), 수수료·세금 미포함 — 계산은 API
   * - 평가단가는 최신 종가. 평가손익 = 평가금액 - 매입가. 평가손익·수익률만 + 는 붉은색, - 는 파란색
   * API: accountApi.list / balance
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { accountApi } from '$lib/api/accountApi';

  /** @param {any} v @param {number} digits */
  const fmt = (v, digits) =>
    v === null || v === undefined ? '-' : Number(v).toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

  /** 부호(+) 표시, + 는 붉은색, - 는 파란색 @param {any} v @param {number} digits */
  const fmtSignedColor = (v, digits) => {
    const text = v === null || v === undefined ? '-' : `${Number(v) > 0 ? '+' : ''}${fmt(v, digits)}`;
    if (v === null || v === undefined || Number(v) === 0) return text;
    return `<span class="${Number(v) > 0 ? 'text-red-600' : 'text-blue-600'}">${text}</span>`;
  };

  const columns = [
    { header: '종목', name: 'name', minWidth: 200, sortable: true, formatter: (/** @type {any} */ { value, row }) => `${value} <span class="text-gray-400">${row.ticker}</span>` },
    { header: '보유수량', name: 'quantity', align: 'right', width: 100, sortable: true, formatter: (/** @type {any} */ { value }) => fmt(value, 0) },
    { header: '매입단가', name: 'avgBuyPrice', align: 'right', width: 110, formatter: (/** @type {any} */ { value }) => fmt(value, 0) },
    { header: '매입가', name: 'buyAmount', align: 'right', minWidth: 130, sortable: true, formatter: (/** @type {any} */ { value }) => fmt(value, 0) },
    { header: '평가단가', name: 'currentPrice', align: 'right', width: 110, formatter: (/** @type {any} */ { value }) => fmt(value, 0) },
    { header: '평가금액', name: 'valueAmount', align: 'right', minWidth: 130, sortable: true, formatter: (/** @type {any} */ { value }) => fmt(value, 0) },
    { header: '평가손익', name: 'profitAmount', align: 'right', minWidth: 130, sortable: true, formatter: (/** @type {any} */ { value }) => fmtSignedColor(value, 0) },
    { header: '수익률(%)', name: 'returnRate', align: 'right', width: 100, sortable: true, formatter: (/** @type {any} */ { value }) => fmtSignedColor(value, 2) }
  ];

  /** @type {any} */
  let grid;
  /** @type {Array<{value:any,label:string}>} */
  let accountOptions = $state([]);
  let accountId = $state('');
  /** @type {{cashBalanceKrw:number, stockValueKrw:number, totalValueKrw:number, priceDate:string|null} | null} */
  let summary = $state(null);

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  /** @param {any} g */
  async function handleReady(g) {
    grid = g;
    try {
      const list = await accountApi.list();
      accountOptions = (list ?? []).map((/** @type {any} */ a) => ({
        value: String(a.accountId),
        label: `${a.name}-${a.accountNumber}${a.isActive ? '' : ' · 비활성'}`
      }));
      if (accountOptions.length > 0) accountId = String(accountOptions[0].value);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      alert(`계좌 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  async function loadBalance() {
    if (!accountId) {
      grid?.resetData([]);
      return;
    }
    try {
      const res = await accountApi.balance(accountId);
      // 평가손익 = 평가금액 - 매입가 (시세가 없어 평가금액이 없으면 NULL)
      const items = (res?.items ?? []).map((/** @type {any} */ i) => ({
        ...i,
        profitAmount: i.valueAmount === null || i.valueAmount === undefined ? null : Number(i.valueAmount) - Number(i.buyAmount ?? 0)
      }));
      grid?.resetData(items);
      summary = {
        cashBalanceKrw: res?.cashBalanceKrw ?? 0,
        stockValueKrw: res?.stockValueKrw ?? 0,
        totalValueKrw: res?.totalValueKrw ?? 0,
        priceDate: res?.priceDate ?? null
      };
    } catch (error) {
      console.error('Failed to load balance:', error);
      alert(`계좌잔고를 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  /** 계좌를 바꾸면 이전 결과를 지우고 [Search]를 기다린다 */
  function handleAccountChange() {
    summary = null;
    grid?.resetData([]);
  }

  const actions = [{ label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: loadBalance }];
</script>

<StandardListPage title="계좌잔고" {columns} {actions} onReady={handleReady}>
  {#snippet filters()}
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
      <LookupComboBox
        id="ab-account"
        label="계좌"
        class="sm:col-span-2"
        options={accountOptions}
        bind:value={accountId}
        placeholder={accountOptions.length === 0 ? '등록된 계좌 없음' : ''}
        onchange={handleAccountChange}
      />
      <div class="sm:col-span-1 lg:col-span-4 text-xs text-gray-400">
        {#if !summary}
          계좌를 선택하고 [Search]를 누르면 잔고를 조회합니다.
        {:else}
          평가단가는 {summary.priceDate ?? '-'} 종가 기준, 매입단가는 이동평균(수수료 미포함)입니다.
        {/if}
      </div>
    </div>
  {/snippet}

  {#snippet footer()}
    <dl class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
      <div class="flex justify-between sm:block">
        <dt class="text-xs text-gray-500">주식 평가금액</dt>
        <dd class="font-semibold text-gray-800 tabular-nums">{summary ? fmt(summary.stockValueKrw, 0) : '-'}</dd>
      </div>
      <div class="flex justify-between sm:block">
        <dt class="text-xs text-gray-500">현금잔고</dt>
        <dd class="font-semibold text-gray-800 tabular-nums">{summary ? fmt(summary.cashBalanceKrw, 0) : '-'}</dd>
      </div>
      <div class="flex justify-between sm:block">
        <dt class="text-xs text-gray-500">계좌 평가금액 (주식 + 현금)</dt>
        <dd class="font-bold text-indigo-700 tabular-nums">{summary ? fmt(summary.totalValueKrw, 0) : '-'}</dd>
      </div>
    </dl>
  {/snippet}
</StandardListPage>
