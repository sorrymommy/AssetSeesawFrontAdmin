<script>
  /**
   * 목표비율<-> 종목 연결 [구현]
   * 포트폴리오 선택 → 연결된 계좌들의 보유 종목이 목표비율 '구분' 중 어디에 해당하는지 지정
   * - 같은 포트폴리오 안에서는 종목이 어느 계좌에 있든 한 구분 (포트폴리오+종목 단위)
   * - 현금 잔액은 연결 없이 항상 '현금' 구분. 연결 안 된 종목은 '미분류'로 평가된다
   * - 그리드의 '구분' 셀을 더블클릭해 종목별로 고른 뒤 [Save]로 바뀐 행만 저장 ('미분류' = 연결 해제)
   * API: portfolioApi.list / categories / assetMappings / setAssetMapping / removeAssetMapping
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { portfolioApi } from '$lib/api/portfolioApi';

  /** @param {any} v */
  const num = (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 6 }));
  /**
   * 그리드 select 값: 구분 id 문자열, UNCLASSIFIED = 미분류.
   * 빈 문자열을 쓰면 select 편집기가 현재 값을 못 찾아 첫 항목(현금)을 선택한 채 열리므로 별도 값을 쓴다.
   */
  const UNCLASSIFIED = 'UNCLASSIFIED';

  /**
   * 구분 select 목록은 포트폴리오마다 달라서 구분을 불러올 때마다 컬럼을 다시 만든다.
   * @param {any[]} cats
   */
  function buildColumns(cats) {
    return [
      { header: '티커', name: 'ticker', width: 100, sortable: true },
      { header: '종목명', name: 'stockName', minWidth: 180, sortable: true },
      { header: '보유수량', name: 'quantity', align: 'right', width: 110, formatter: (/** @type {any} */ { value }) => num(value) },
      { header: '평가액(KRW)', name: 'valueKrw', align: 'right', width: 140, sortable: true, formatter: (/** @type {any} */ { value }) => num(value) },
      {
        header: '구분 (더블클릭하여 선택)',
        name: 'categoryKey',
        minWidth: 180,
        formatter: 'listItemText',
        editor: {
          type: 'select',
          options: {
            // 항목을 고르면 바로 셀 값에 반영 (편집 상태로 남아 값이 확정되지 않는 것 방지)
            instantApply: true,
            listItems: [
              ...cats.map((c) => ({ text: c.isCash ? `${c.name} (현금성)` : c.name, value: String(c.categoryId) })),
              { text: '⚠ 미분류', value: UNCLASSIFIED }
            ]
          }
        }
      },
      { header: '상태', name: 'heldLabel', align: 'center', width: 90 }
    ];
  }

  /** @type {any} */
  let grid;
  /** @type {Array<{value:any,label:string}>} */
  let portfolioOptions = $state([]);
  let portfolioId = $state('');
  /** 포트폴리오 변경 전 값 (저장 안 된 변경이 있을 때 되돌리기용) */
  let loadedPortfolioId = '';
  let unclassifiedCount = $state(0);
  let heldCount = $state(0);

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  /** @returns {any[]} 구분이 바뀐 행 (저장 대상) */
  function changedRows() {
    const updated = /** @type {any[]} */ (grid?.getModifiedRows()?.updatedRows ?? []);
    return updated.filter((r) => (r.categoryKey ?? UNCLASSIFIED) !== r.originalKey);
  }

  /** @param {any} g */
  async function handleReady(g) {
    grid = g;
    try {
      const list = await portfolioApi.list();
      portfolioOptions = (list ?? []).map((/** @type {any} */ p) => ({ value: String(p.portfolioId), label: p.name }));
      if (portfolioOptions.length > 0) {
        portfolioId = String(portfolioOptions[0].value);
        await loadMappings();
      }
    } catch (error) {
      console.error('Failed to load portfolios:', error);
      alert(`포트폴리오 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  async function loadMappings() {
    loadedPortfolioId = portfolioId;
    if (!portfolioId) {
      grid?.resetData([]);
      return;
    }
    try {
      const [cats, rows] = await Promise.all([portfolioApi.categories(portfolioId), portfolioApi.assetMappings(portfolioId)]);
      const list = rows ?? [];
      heldCount = list.filter((/** @type {any} */ r) => r.isHeld).length;
      unclassifiedCount = list.filter((/** @type {any} */ r) => r.isHeld && r.categoryId == null).length;
      grid?.setColumns(buildColumns(cats ?? []));
      grid?.resetData(
        list.map((/** @type {any} */ r) => {
          const key = r.categoryId == null ? UNCLASSIFIED : String(r.categoryId);
          return { ...r, categoryKey: key, originalKey: key, heldLabel: r.isHeld ? '보유' : '미보유' };
        })
      );
    } catch (error) {
      console.error('Failed to load asset mappings:', error);
      alert(`종목 연결 정보를 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  /** 저장 안 된 변경이 있으면 확인 후 진행 */
  function confirmDiscard() {
    grid?.finishEditing();
    const n = changedRows().length;
    return n === 0 || confirm(`저장하지 않은 변경 ${n}건이 있습니다. 무시하고 진행할까요?`);
  }

  function handlePortfolioChange() {
    if (!confirmDiscard()) {
      portfolioId = loadedPortfolioId; // 선택을 되돌린다
      return;
    }
    loadMappings();
  }

  function handleSearch() {
    if (confirmDiscard()) loadMappings();
  }

  async function save() {
    grid?.finishEditing();
    const rows = changedRows();
    if (rows.length === 0) {
      alert('변경된 구분이 없습니다.');
      return;
    }
    /** @type {string[]} */
    const failures = [];
    for (const row of rows) {
      try {
        if ((row.categoryKey ?? UNCLASSIFIED) === UNCLASSIFIED) {
          await portfolioApi.removeAssetMapping(portfolioId, row.stockId);
        } else {
          await portfolioApi.setAssetMapping(portfolioId, row.stockId, Number(row.categoryKey));
        }
      } catch (error) {
        failures.push(`${row.stockName}: ${errorMessage(error)}`);
      }
    }
    if (failures.length > 0) alert(`일부 종목을 저장하지 못했습니다.\n${failures.join('\n')}`);
    await loadMappings();
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: handleSearch },
    { label: 'Save', color: BUTTON_COLORS.BLUE, iconType: 'save', onClick: save }
  ];
</script>

<StandardListPage title="목표비율<-> 종목 연결" columns={buildColumns([])} {actions} onReady={handleReady}>
  {#snippet filters()}
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
      <LookupComboBox
        id="am-portfolio"
        label="포트폴리오"
        class="sm:col-span-2"
        options={portfolioOptions}
        bind:value={portfolioId}
        placeholder={portfolioOptions.length === 0 ? '등록된 포트폴리오 없음' : ''}
        onchange={handlePortfolioChange}
      />
      <div class="sm:col-span-1 lg:col-span-4 text-xs space-y-0.5">
        {#if unclassifiedCount > 0}
          <div><span class="font-semibold text-rose-600">보유 종목 {heldCount}개 중 {unclassifiedCount}개가 미분류입니다.</span> <span class="text-gray-500">미분류 종목은 목표비율 비교에서 별도로 표시됩니다.</span></div>
        {:else}
          <div class="text-gray-500">보유 종목 {heldCount}개 모두 구분에 연결되어 있습니다. 현금 잔액은 항상 '현금' 구분입니다.</div>
        {/if}
        <div class="text-gray-400">'구분' 셀을 더블클릭해 종목별로 고른 뒤 [Save]를 누르면 바뀐 종목만 저장됩니다. 구분은 목표비율명 관리에서 추가합니다.</div>
      </div>
    </div>
  {/snippet}
</StandardListPage>
