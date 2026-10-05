<script>
  /**
   * 포트폴리오 평가 [구현]
   * 포트폴리오 선택 후 [Search] → 목표비율별 목표비중 vs 평가비중·평가액·괴리 (목표 대비 + 붉은색, - 파란색)
   * (화면을 열거나 포트폴리오를 바꿔도 자동으로 조회하지 않는다)
   * - 종목은 '종목 구분 연결'로 구분에 합산, 현금 잔액은 '현금' 구분
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
    { header: '목표비율명', name: 'categoryName', minWidth: 160 },
    { header: '목표비중(%)', name: 'targetWeight', align: 'right', width: 110, formatter: (/** @type {any} */ { value }) => fmt(value, 2) },
    { header: '평가비중(%)', name: 'currentWeight', align: 'right', width: 110, formatter: (/** @type {any} */ { value, row }) => colorByGap(row, fmt(value, 2)) },
    { header: '평가액', name: 'valueKrw', align: 'right', minWidth: 140, sortable: true, formatter: (/** @type {any} */ { value, row }) => colorByGap(row, fmt(value, 0)) },
    // 평가액 - (총평가액 × 목표비중). + 는 목표보다 많음(매도 쪽), - 는 부족(매수 쪽)
    { header: '괴리금액', name: 'gapValueKrw', align: 'right', minWidth: 140, formatter: (/** @type {any} */ { value, row }) => colorByGap(row, fmtSigned(value, 0)) },
    // 평가비중 - 목표비중
    { header: '괴리(%p)', name: 'gap', align: 'right', width: 100, formatter: (/** @type {any} */ { value, row }) => colorByGap(row, fmtSigned(value, 2)) }
  ];

  /** 그리드 하단 합계 행 — 평가액 합계 (= 총평가액) */
  const summary = {
    height: 40,
    position: 'bottom',
    columnContent: {
      categoryName: { template: () => '<span class="font-semibold">합계</span>' },
      valueKrw: { template: (/** @type {any} */ v) => `<div class="text-right font-semibold">${fmt(v.sum, 0)}</div>` }
    }
  };

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
      const totalValueKrw = Number(res?.totalValueKrw ?? 0);
      // 목표액 = 총평가액 × 목표비중, 괴리금액 = 평가액 - 목표액 (목표가 없으면 NULL)
      const items = (res?.items ?? []).map((/** @type {any} */ i) => {
        const hasWeight = i.targetWeight !== null && i.targetWeight !== undefined;
        const targetValueKrw = hasWeight ? (totalValueKrw * Number(i.targetWeight)) / 100 : null;
        return { ...i, targetValueKrw, gapValueKrw: targetValueKrw === null ? null : Number(i.valueKrw ?? 0) - targetValueKrw };
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

<StandardListPage title="포트폴리오 평가" {columns} {actions} {summary} onReady={handleReady}>
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
          <div class="font-semibold text-rose-600">구분에 연결되지 않은 보유 종목이 있습니다. '종목 구분 연결'에서 지정하세요.</div>
        {/if}
        {#if loaded && !hasTarget}
          <div class="text-amber-600">적용 중인 목표비율 버전이 없습니다. '목표비율 관리'에서 등록하세요.</div>
        {/if}
      </div>
    </div>
  {/snippet}
</StandardListPage>
