<script>
  /**
   * 종목 구분 연결 [구현]
   * 포트폴리오 선택 → 연결된 계좌들의 보유 종목이 목표비율 '구분' 중 어디에 해당하는지 지정
   * - 같은 포트폴리오 안에서는 종목이 어느 계좌에 있든 한 구분 (포트폴리오+종목 단위)
   * - 현금 잔액은 연결 없이 항상 '현금' 구분. 연결 안 된 종목은 '미분류'로 평가된다
   * - 행 더블클릭 = 그 종목만, [구분 지정] = 체크한 종목 모두
   * API: portfolioApi.list / categories / assetMappings / setAssetMapping / removeAssetMapping
   */
  import { tick } from 'svelte';
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { portfolioApi } from '$lib/api/portfolioApi';

  /** @param {any} v */
  const num = (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 6 }));
  const UNCLASSIFIED = '미분류';

  const columns = [
    { header: '티커', name: 'ticker', width: 100, sortable: true },
    { header: '종목명', name: 'stockName', minWidth: 180, sortable: true },
    { header: '보유수량', name: 'quantity', align: 'right', width: 110, formatter: (/** @type {any} */ { value }) => num(value) },
    { header: '평가액(KRW)', name: 'valueKrw', align: 'right', width: 140, sortable: true, formatter: (/** @type {any} */ { value }) => num(value) },
    {
      header: '구분',
      name: 'categoryName',
      minWidth: 140,
      sortable: true,
      formatter: (/** @type {any} */ { value }) => value ?? `⚠ ${UNCLASSIFIED}`
    },
    { header: '상태', name: 'heldLabel', align: 'center', width: 90 }
  ];

  /** @type {any} */
  let grid;
  /** @type {Array<{value:any,label:string}>} */
  let portfolioOptions = $state([]);
  let portfolioId = $state('');
  /** @type {any[]} */
  let categories = $state([]);
  let unclassifiedCount = $state(0);
  let heldCount = $state(0);

  let isOpen = $state(false);
  /** @type {any[]} 구분을 지정할 대상 종목 */
  let targets = $state([]);
  /** 선택한 구분 id ('' = 미분류 → 연결 해제) */
  let selectedCategoryId = $state('');

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
    if (!portfolioId) {
      grid?.resetData([]);
      return;
    }
    try {
      const [cats, rows] = await Promise.all([portfolioApi.categories(portfolioId), portfolioApi.assetMappings(portfolioId)]);
      categories = cats ?? [];
      const list = rows ?? [];
      heldCount = list.filter((/** @type {any} */ r) => r.isHeld).length;
      unclassifiedCount = list.filter((/** @type {any} */ r) => r.isHeld && r.categoryId == null).length;
      grid?.resetData(list.map((/** @type {any} */ r) => ({ ...r, heldLabel: r.isHeld ? '보유' : '미보유' })));
    } catch (error) {
      console.error('Failed to load asset mappings:', error);
      alert(`종목 연결 정보를 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  /** @param {any[]} rows */
  function openAssign(rows) {
    if (rows.length === 0) {
      alert('구분을 지정할 종목을 체크하세요. (한 종목은 행 더블클릭)');
      return;
    }
    targets = rows;
    // 모두 같은 구분이면 그 구분을, 아니면 첫 구분을 기본 선택
    const ids = new Set(rows.map((r) => r.categoryId ?? ''));
    selectedCategoryId = ids.size === 1 ? String([...ids][0]) : String(categories.find((c) => !c.isCash)?.categoryId ?? '');
    isOpen = true;
  }

  async function save() {
    try {
      for (const row of targets) {
        if (selectedCategoryId === '') {
          if (row.categoryId != null) await portfolioApi.removeAssetMapping(portfolioId, row.stockId);
        } else {
          await portfolioApi.setAssetMapping(portfolioId, row.stockId, Number(selectedCategoryId));
        }
      }
      await loadMappings();
    } catch (error) {
      console.error('Failed to save asset mapping:', error);
      alert(`저장에 실패했습니다.\n${errorMessage(error)}`);
      await tick();
      isOpen = true; // 선택을 유지한 채 팝업을 다시 연다
    }
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: loadMappings },
    { label: '구분 지정', color: BUTTON_COLORS.PURPLE, onClick: () => openAssign(grid?.getCheckedRows() ?? []) }
  ];
</script>

<StandardListPage title="종목 구분 연결" {columns} {actions} onReady={handleReady} onRowDblClick={(/** @type {any} */ row) => openAssign([row])}>
  {#snippet filters()}
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
      <LookupComboBox
        id="am-portfolio"
        label="포트폴리오"
        class="sm:col-span-2"
        options={portfolioOptions}
        bind:value={portfolioId}
        placeholder={portfolioOptions.length === 0 ? '등록된 포트폴리오 없음' : ''}
        onchange={loadMappings}
      />
      <div class="sm:col-span-1 lg:col-span-4 text-xs">
        {#if unclassifiedCount > 0}
          <span class="font-semibold text-rose-600">보유 종목 {heldCount}개 중 {unclassifiedCount}개가 미분류입니다.</span>
          <span class="text-gray-500">미분류 종목은 목표비율 비교에서 별도로 표시됩니다.</span>
        {:else}
          <span class="text-gray-500">보유 종목 {heldCount}개 모두 구분에 연결되어 있습니다. 현금 잔액은 항상 '현금' 구분입니다.</span>
        {/if}
      </div>
    </div>
  {/snippet}

  <Modal bind:isOpen title="구분 지정" width="max-w-md" onSave={save}>
    <p class="text-sm text-gray-600">
      {targets.length === 1 ? `${targets[0].stockName} (${targets[0].ticker})` : `선택한 종목 ${targets.length}개`}의 구분을 지정합니다.
    </p>
    <div>
      <label for="am-category" class="block text-sm font-medium text-gray-700 mb-1">구분</label>
      <select id="am-category" bind:value={selectedCategoryId} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2">
        {#each categories as c (c.categoryId)}
          <option value={String(c.categoryId)}>{c.name}{c.isCash ? ' (현금성 종목)' : ''}</option>
        {/each}
        <option value="">{UNCLASSIFIED} (연결 해제)</option>
      </select>
    </div>
    <p class="text-xs text-gray-400">같은 포트폴리오 안에서는 종목이 어느 계좌에 있든 같은 구분으로 계산됩니다. 구분은 목표비율 관리 → 구분 관리에서 추가합니다.</p>
  </Modal>
</StandardListPage>
