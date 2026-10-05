<script>
  /**
   * 포트폴리오 평가 [구현]
   * 포트폴리오 선택 후 [Search] → 목표비율별 목표비중 vs 평가비중·평가액·괴리 (목표 대비 + 붉은색, - 파란색)
   * (화면을 열거나 포트폴리오를 바꿔도 자동으로 조회하지 않는다)
   * - 구분 행 아래에 종목 행(트리). 종목 목표비중(전체 대비) = 구분 목표비중 × 세부비율 — 세부비율이 있는 구분만
   *   (세부비율을 안 넣은 구분의 종목은 목표 없이 평가만, 세부비율이 있지만 지금은 연결이 바뀐 종목은 '연결 해제' 평가액 0)
   * - 종목은 '목표비율<-> 종목 연결'로 구분에 합산, 현금 잔액은 '현금' 구분 아래 '현금 잔액' 행
   * - 구분에 연결 안 된 보유 종목은 '미분류' 행 + 경고
   * - 리밸런싱 제안은 구분 기준 방식 설계 전이라 이 화면에 두지 않는다
   * API: portfolioApi.list / valuation
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { portfolioApi } from '$lib/api/portfolioApi';

  /** @param {any} v @param {number} digits */
  const fmt = (v, digits) =>
    v === null || v === undefined ? '-' : Number(v).toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

  /** 부호 표시(+/-) 포함 */
  /** @param {any} v @param {number} digits */
  const fmtSigned = (v, digits) => (v === null || v === undefined ? '-' : `${Number(v) > 0 ? '+' : ''}${fmt(v, digits)}`);

  /**
   * 목표비중 대비 + 는 붉은색, - 는 파란색 (괴리 기준). 목표가 없으면(미분류 등) 색 없음
   * @param {any} row @param {string} text
   */
  const colorByGap = (row, text) => {
    const gap = row?.gap;
    if (gap === null || gap === undefined || Number(gap) === 0) return text;
    return `<span class="${Number(gap) > 0 ? 'text-red-600' : 'text-blue-600'}">${text}</span>`;
  };

  const columns = [
    { header: '목표비율명 / 종목', name: 'categoryName', minWidth: 220 },
    // 구분 행: 세부비율 입력 여부, 종목 행: 구분 안 세부비율
    { header: '세부비율(%)', name: 'stockWeight', align: 'right', width: 100, formatter: (/** @type {any} */ { value, row }) => (row.isStock ? fmt(value, 2) : row.detailLabel ?? '') },
    { header: '목표비중(%)', name: 'targetWeight', align: 'right', width: 110, formatter: (/** @type {any} */ { value }) => fmt(value, 2) },
    { header: '평가비중(%)', name: 'currentWeight', align: 'right', width: 110, formatter: (/** @type {any} */ { value, row }) => colorByGap(row, fmt(value, 2)) },
    { header: '평가액', name: 'valueKrw', align: 'right', minWidth: 140, sortable: true, formatter: (/** @type {any} */ { value, row }) => colorByGap(row, fmt(value, 0)) },
    // 평가액 - (총평가액 × 목표비중). + 는 목표보다 많음(매도 쪽), - 는 부족(매수 쪽)
    { header: '괴리금액', name: 'gapValueKrw', align: 'right', minWidth: 140, formatter: (/** @type {any} */ { value, row }) => colorByGap(row, fmtSigned(value, 0)) },
    // 평가비중 - 목표비중
    { header: '괴리(%p)', name: 'gap', align: 'right', width: 100, formatter: (/** @type {any} */ { value, row }) => colorByGap(row, fmtSigned(value, 2)) }
  ];

  /** 총평가액 — 트리라 그리드 합계(sum)는 종목 행까지 더하므로 API 값을 쓴다 */
  let totalValueKrw = 0;

  /** 그리드 하단 합계 행 — 총평가액 */
  const summary = {
    height: 40,
    position: 'bottom',
    columnContent: {
      categoryName: { template: () => '<span class="font-semibold">합계</span>' },
      valueKrw: { template: () => `<div class="text-right font-semibold">${fmt(totalValueKrw, 0)}</div>` }
    }
  };

  const treeColumnOptions = { name: 'categoryName', useIcon: false };

  /** 목표액·괴리금액 계산 (목표가 없으면 NULL) @param {any} i */
  function withGapValue(i) {
    const hasWeight = i.targetWeight !== null && i.targetWeight !== undefined;
    const targetValueKrw = hasWeight ? (totalValueKrw * Number(i.targetWeight)) / 100 : null;
    return { ...i, targetValueKrw, gapValueKrw: targetValueKrw === null ? null : Number(i.valueKrw ?? 0) - targetValueKrw };
  }

  /** 종목 행 표시명 @param {any} s */
  function stockLabel(s) {
    if (s.isCashBalance) return s.name;
    const name = `${s.name ?? s.stockId}${s.ticker ? ` (${s.ticker})` : ''}`;
    return s.unlinked ? `${name} · 연결 해제` : name;
  }

  /** @type {any} */
  let grid;
  /** @type {Array<{value:any,label:string}>} */
  let portfolioOptions = $state([]);
  let portfolioId = $state('');
  let hasUnclassified = $state(false);
  let hasTarget = $state(true);
  /** 현재 선택한 포트폴리오를 조회했는지 (조회 전에는 경고를 표시하지 않는다) */
  let loaded = $state(false);

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  /** @param {any} g */
  async function handleReady(g) {
    grid = g;
    try {
      const list = await portfolioApi.list();
      portfolioOptions = (list ?? []).map((/** @type {any} */ p) => ({ value: String(p.portfolioId), label: p.name }));
      if (portfolioOptions.length > 0) portfolioId = String(portfolioOptions[0].value);
    } catch (error) {
      console.error('Failed to load portfolios:', error);
      alert(`포트폴리오 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  async function loadValuation() {
    if (!portfolioId) {
      grid?.resetData([]);
      return;
    }
    try {
      const res = await portfolioApi.valuation(portfolioId);
      totalValueKrw = Number(res?.totalValueKrw ?? 0);
      // 목표액 = 총평가액 × 목표비중, 괴리금액 = 평가액 - 목표액 (목표가 없으면 NULL)
      const items = (res?.items ?? []).map((/** @type {any} */ i) => {
        const stocks = /** @type {any[]} */ (i.stocks ?? []);
        const hasStocks = stocks.some((s) => !s.isCashBalance);
        return {
          ...withGapValue(i),
          detailLabel: !hasStocks ? '' : i.hasStockWeights ? '입력' : '미입력',
          _attributes: { expanded: true },
          _children: stocks.map((s) => ({ ...withGapValue(s), categoryName: stockLabel(s), isStock: true }))
        };
      });
      hasUnclassified = res?.hasUnclassified ?? false;
      hasTarget = items.some((/** @type {any} */ i) => i.targetValueKrw !== null);
      grid?.resetData(items);
      loaded = true;
    } catch (error) {
      console.error('Failed to load valuation:', error);
      alert(`평가 정보를 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  /** 포트폴리오를 바꾸면 이전 결과를 지우고 [Search]를 기다린다 */
  function handlePortfolioChange() {
    loaded = false;
    grid?.resetData([]);
  }

  const actions = [{ label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: loadValuation }];
</script>

<StandardListPage title="포트폴리오 평가" {columns} {actions} {summary} {treeColumnOptions} onReady={handleReady}>
  {#snippet filters()}
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
      <LookupComboBox
        id="pv-portfolio"
        label="포트폴리오"
        class="sm:col-span-2"
        options={portfolioOptions}
        bind:value={portfolioId}
        placeholder={portfolioOptions.length === 0 ? '등록된 포트폴리오 없음' : ''}
        onchange={handlePortfolioChange}
      />
      <div class="sm:col-span-1 lg:col-span-4 text-xs space-y-0.5">
        {#if !loaded}
          <div class="text-gray-400">포트폴리오를 선택하고 [Search]를 누르면 평가를 조회합니다.</div>
        {/if}
        {#if loaded && hasUnclassified}
          <div class="font-semibold text-rose-600">구분에 연결되지 않은 보유 종목이 있습니다. '목표비율&lt;-> 종목 연결'에서 지정하세요.</div>
        {/if}
        {#if loaded && !hasTarget}
          <div class="text-amber-600">적용 중인 목표비율 버전이 없습니다. '포트폴리오 비율관리'에서 등록하세요.</div>
        {/if}
      </div>
    </div>
  {/snippet}
</StandardListPage>
