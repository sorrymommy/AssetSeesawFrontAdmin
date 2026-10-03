<script>
  /**
   * 포트폴리오 평가 [구현]
   * 포트폴리오 선택 후 [Search] → 목표비율 구분별 평가액(KRW)·현재 비중 vs 목표 비중·괴리
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
  const fmt = (v, digits) => (v === null || v === undefined ? '-' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: digits }));

  const columns = [
    { header: '구분', name: 'categoryName', minWidth: 160 },
    { header: '평가액(KRW)', name: 'valueKrw', align: 'right', minWidth: 150, sortable: true, formatter: (/** @type {any} */ { value }) => fmt(value, 0) },
    { header: '현재비중(%)', name: 'currentWeight', align: 'right', width: 120, formatter: (/** @type {any} */ { value }) => fmt(value, 2) },
    { header: '목표비중(%)', name: 'targetWeight', align: 'right', width: 120, formatter: (/** @type {any} */ { value }) => fmt(value, 2) },
    {
      header: '괴리(%p)',
      name: 'gap',
      align: 'right',
      width: 110,
      // 현재 - 목표. + 는 목표보다 많음(매도 쪽), - 는 부족(매수 쪽)
      formatter: (/** @type {any} */ { value }) => (value === null || value === undefined ? '-' : `${Number(value) > 0 ? '+' : ''}${fmt(value, 2)}`)
    }
  ];

  /** @type {any} */
  let grid;
  /** @type {Array<{value:any,label:string}>} */
  let portfolioOptions = $state([]);
  let portfolioId = $state('');
  let totalValueKrw = $state(0);
  let hasUnclassified = $state(false);
  let hasTarget = $state(true);
  /** 현재 선택한 포트폴리오를 조회했는지 (조회 전에는 합계·경고를 표시하지 않는다) */
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
      const items = res?.items ?? [];
      totalValueKrw = res?.totalValueKrw ?? 0;
      hasUnclassified = res?.hasUnclassified ?? false;
      hasTarget = items.some((/** @type {any} */ i) => i.targetWeight !== null && i.targetWeight !== undefined);
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

<StandardListPage title="포트폴리오 평가" {columns} {actions} onReady={handleReady}>
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
        {:else}
          <div class="text-gray-700">총평가액 <span class="text-sm font-semibold">{fmt(totalValueKrw, 0)}원</span> <span class="text-gray-400">(최신 종가 기준, 현금 포함)</span></div>
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
