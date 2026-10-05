<script>
  /**
   * 포트폴리오 비율관리 [구현] — 마스터(구분별 목표비율)·디테일(구분 안 종목 세부비율) 그리드
   * - 포트폴리오와 기준 버전(적용일)을 고르면 그 버전의 비율을 불러온다 (버전이 없으면 현금 100으로 시작)
   * - 마스터: 구분별 목표비율 ✎ / 디테일: 마스터에서 고른 구분에 '목표비율<-> 종목 연결'로 연결된 종목의 세부비율 ✎
   * - 고친 뒤 [저장] → 기준 버전에 덮어쓰기(메모 수정 가능, 적용일 고정) / [새 버전 저장] → 적용일을 받아 새 버전으로 저장
   *   [버전 삭제]는 기준 버전 삭제
   * 규칙: 구분 비율은 살아있는 모든 구분(현금 포함) 합 = 100 (0 허용).
   *       세부비율은 구분 비율 대비 %로 구분마다 선택 — 하나라도 넣은 구분은 종목 합 = 100 (빈 칸 = 0), 모두 비우면 '미입력'.
   *       기준 버전에 있지만 지금은 그 구분에 연결되지 않은 종목은 '연결 해제'로 보여 주고 새 버전에서는 뺀다.
   * 탭이 다시 보이거나 기준 버전을 바꾸면 구분·종목 연결을 다시 불러온다 (저장하지 않은 변경이 있으면 탭 전환 시에는 유지).
   * API: portfolioApi.list / categories / assetMappings / targets·createTarget·updateTarget·removeTarget
   */
  import { onMount, onDestroy, tick } from 'svelte';
  import 'tui-grid/dist/tui-grid.css';
  import UiButton from '$lib/components/controls/Button.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { portfolioApi } from '$lib/api/portfolioApi';
  import { tabStore } from '$lib/stores/tabStore';

  /** 비중은 소수 4자리까지 — 합계 비교는 정수(만분율)로 해서 부동소수 오차를 피한다 */
  const SCALE = 10000;
  /** @param {any} v */
  const trimmed = (v) => String(v ?? '').trim();
  /** @param {any} v */
  const toUnits = (v) => Math.round(Number(trimmed(v) || 0) * SCALE);
  /** @param {any} v 숫자(또는 빈 값)만 허용 */
  const isNumeric = (v) => trimmed(v) === '' || /^\d+(\.\d+)?$/.test(trimmed(v));
  /** @param {number} units */
  const pct = (units) => `${units / SCALE}%`;
  /** @param {any} v */
  const num = (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 0 }));

  const masterColumns = [
    { header: '구분', name: 'name', minWidth: 120 },
    { header: '목표비율(%) ✎', name: 'weight', align: 'right', width: 110, editor: 'text' },
    { header: '세부비율', name: 'detailLabel', align: 'center', width: 90 },
    { header: '연결 종목', name: 'stockCount', align: 'right', width: 80 }
  ];

  const detailColumns = [
    { header: '티커', name: 'ticker', width: 90 },
    { header: '종목명', name: 'stockName', minWidth: 160 },
    { header: '세부비율(%) ✎', name: 'weight', align: 'right', width: 120, editor: 'text' },
    { header: '전체 대비(%)', name: 'overall', align: 'right', width: 110 },
    { header: '평가액(KRW)', name: 'valueKrw', align: 'right', width: 130, formatter: (/** @type {any} */ { value }) => num(value) },
    { header: '상태', name: 'status', align: 'center', width: 130 }
  ];

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

  /** @type {Array<{value:any,label:string}>} */
  let portfolioOptions = $state([]);
  let portfolioId = $state('');
  let loadedPortfolioId = '';
  /** @type {any[]} 현재 포트폴리오의 버전 (적용일 내림차순) */
  let versions = $state([]);
  let versionId = $state('');
  let loadedVersionId = '';
  const versionOptions = $derived(
    versions.map((v, i) => ({ value: String(v.versionId), label: `${v.effectiveDate}${i === 0 ? ' (최신)' : ''}${v.memo ? ` · ${v.memo}` : ''}` }))
  );

  /** @type {any[]} 살아있는 구분 (정렬순서) */
  let categories = $state([]);
  /** @type {any[]} 종목 연결 (보유 종목 + 연결된 구분) */
  let mappingRows = [];
  /** @type {Record<number, any[]>} 구분별 디테일 행 (화면에서 고친 값 포함) */
  let detailByCategory = {};
  /** 디테일에 표시 중인 구분 */
  let selectedCategoryId = $state(/** @type {number|null} */ (null));
  const selectedCategory = $derived(categories.find((c) => c.categoryId === selectedCategoryId));
  /** 마스터 합계 (만분율) */
  let masterTotal = $state(0);
  /** 저장하지 않은 변경 여부 */
  let dirty = $state(false);
  /** 비율을 고칠 때마다 증가 — 일반 객체인 디테일 보관소 기반 표시를 다시 계산시킨다 */
  let revision = $state(0);

  // 저장 팝업 — mode 'update' = 기준 버전 덮어쓰기, 'create' = 새 버전
  let isSaveOpen = $state(false);
  let saveForm = $state({ mode: 'create', effectiveDate: '', memo: '' });

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ==================== 그리드 생성 ====================

  onMount(async () => {
    const { default: Grid } = await import('tui-grid');
    /** @type {any} 두 그리드 공통 옵션 */
    const common = { data: [], scrollX: true, scrollY: true, bodyHeight: 'fitToParent', rowHeaders: ['rowNum'], columnOptions: { resizable: true } };
    masterGrid = new Grid({ ...common, el: masterEl, columns: masterColumns });
    detailGrid = new Grid({ ...common, el: detailEl, columns: detailColumns });

    // 구분 행을 바꾸면 디테일을 그 구분으로 (고친 값은 구분별로 보관)
    masterGrid.on('focusChange', (/** @type {any} */ ev) => {
      if (ev.rowKey === ev.prevRowKey || ev.rowKey === null || ev.rowKey === undefined) return;
      showDetail(masterGrid.getValue(ev.rowKey, 'categoryId'));
    });
    // 계산 컬럼(setValue)의 변경은 무시하고 사용자가 고친 비율만 반영한다
    const weightChanged = (/** @type {any} */ ev) => (ev.changes ?? []).some((/** @type {any} */ c) => c.columnName === 'weight');
    masterGrid.on('afterChange', (/** @type {any} */ ev) => {
      if (!weightChanged(ev)) return;
      dirty = true;
      revision++;
      refreshMasterTotal();
      refreshOverall();
    });
    detailGrid.on('afterChange', (/** @type {any} */ ev) => {
      if (!weightChanged(ev)) return;
      dirty = true;
      revision++;
      stashDetail();
      refreshDetailLabel(selectedCategoryId);
      refreshOverall();
    });

    // 숨김 탭에서 그려진 그리드를 다시 보일 때 바로잡는다 (창 크기 변경도 함께 잡힘)
    resizeObserver = new ResizeObserver(refreshLayout);
    resizeObserver.observe(masterEl);
    resizeObserver.observe(detailEl);

    try {
      const list = await portfolioApi.list();
      portfolioOptions = (list ?? []).map((/** @type {any} */ p) => ({ value: String(p.portfolioId), label: p.name }));
      if (portfolioOptions.length > 0) {
        portfolioId = String(portfolioOptions[0].value);
        await loadAll();
      }
    } catch (error) {
      console.error('Failed to load portfolios:', error);
      alert(`포트폴리오 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  });

  onDestroy(() => {
    unsubscribeTabs();
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

  // 탭을 바꿀 때마다 이 화면이 다시 보이게 됐는지 확인 — 다른 탭에서 바뀐 구분·종목 연결을 반영한다
  let wasVisible = true;
  const unsubscribeTabs = tabStore.subscribe(async () => {
    await tick(); // 탭 표시(hidden 클래스)가 반영된 뒤 확인
    const visible = !!masterEl?.offsetWidth;
    if (visible && !wasVisible) handleShown();
    wasVisible = visible;
  });

  /**
   * 탭이 다시 보이면 최신 구분·종목 연결·버전으로 다시 불러온다 ('목표비율<-> 종목 연결'·'목표비율명 관리'에서 바꾼 내용).
   * 저장하지 않은 변경이 있으면 지우지 않도록 건너뛴다 ([Search]로 직접 불러오면 된다).
   */
  function handleShown() {
    masterGrid?.finishEditing();
    stashDetail();
    if (!dirty && portfolioId) loadAll(versionId);
  }

  // ==================== 조회 ====================

  /** 포트폴리오의 구분·종목 연결·버전을 불러와 기준 버전으로 그린다 @param {string} [keepVersionId] 선택할 버전 (없으면 최신) */
  async function loadAll(keepVersionId) {
    loadedPortfolioId = portfolioId;
    if (!portfolioId) {
      categories = [];
      versions = [];
      versionId = '';
      render(null, []);
      return;
    }
    try {
      const [cats, mappings, vers] = await Promise.all([
        portfolioApi.categories(portfolioId),
        portfolioApi.assetMappings(portfolioId),
        portfolioApi.targets(portfolioId)
      ]);
      categories = cats ?? [];
      versions = vers ?? [];
      versionId = versions.some((v) => String(v.versionId) === keepVersionId) ? String(keepVersionId) : String(versions[0]?.versionId ?? '');
      mappingRows = mappings ?? [];
      render(currentVersion(), mappingRows);
    } catch (error) {
      console.error('Failed to load targets:', error);
      alert(`목표비율 정보를 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  function currentVersion() {
    return versions.find((v) => String(v.versionId) === versionId) ?? null;
  }

  /**
   * 기준 버전의 값으로 마스터·디테일 데이터를 만든다
   * @param {any} version 기준 버전 (없으면 현금 100, 나머지 0)
   * @param {any[]} mappings 종목 연결
   */
  function render(version, mappings) {
    loadedVersionId = versionId;
    /** @type {Record<number, any>} */
    const items = {};
    for (const i of version?.items ?? []) items[i.categoryId] = i;

    detailByCategory = {};
    for (const c of categories) {
      const saved = /** @type {any[]} */ (items[c.categoryId]?.stockItems ?? []);
      /** @type {Record<number, any>} */
      const savedWeights = {};
      for (const s of saved) savedWeights[s.stockId] = s;
      const mapped = mappings.filter((m) => m.categoryId === c.categoryId);
      const rows = mapped.map((m) => ({
        stockId: m.stockId,
        ticker: m.ticker,
        stockName: m.stockName,
        valueKrw: m.valueKrw,
        weight: savedWeights[m.stockId] ? String(Number(savedWeights[m.stockId].targetWeight)) : '',
        mapped: true,
        status: m.isHeld ? '보유' : '미보유'
      }));
      // 기준 버전에 있지만 지금은 이 구분에 연결되지 않은 종목 — 보여만 주고 새 버전에서는 뺀다
      for (const s of saved) {
        if (mapped.some((m) => m.stockId === s.stockId)) continue;
        rows.push({ stockId: s.stockId, ticker: s.ticker, stockName: s.stockName, valueKrw: null, weight: String(Number(s.targetWeight)), mapped: false, status: '연결 해제(저장 제외)' });
      }
      detailByCategory[c.categoryId] = rows;
    }

    masterGrid?.resetData(
      categories.map((c) => ({
        categoryId: c.categoryId,
        name: c.isCash ? `${c.name} (기본)` : c.name,
        weight: String(items[c.categoryId] ? Number(items[c.categoryId].targetWeight) : version ? 0 : c.isCash ? 100 : 0),
        stockCount: detailByCategory[c.categoryId].filter((r) => r.mapped).length,
        detailLabel: ''
      }))
    );
    for (const c of categories) refreshDetailLabel(c.categoryId);
    refreshMasterTotal();
    dirty = false;
    revision++;

    const keep = categories.find((c) => c.categoryId === selectedCategoryId) ?? categories[0];
    // 디테일 그리드에 남은 이전 행이 방금 만든 데이터를 덮어쓰지 않도록 보관(stash) 없이 바꾼다
    selectedCategoryId = null;
    showDetail(keep?.categoryId ?? null);
    const row = masterGrid?.getData().find((/** @type {any} */ r) => r.categoryId === keep?.categoryId);
    if (row) masterGrid.focus(row.rowKey, 'weight');
    setTimeout(refreshLayout, 50);
  }

  // ==================== 마스터 / 디테일 ====================

  /** @param {number|null} categoryId */
  function showDetail(categoryId) {
    stashDetail();
    selectedCategoryId = categoryId;
    const rows = categoryId === null ? [] : (detailByCategory[categoryId] ?? []);
    detailGrid?.resetData(rows.map((r) => ({ ...r })));
    for (const r of detailGrid?.getData() ?? []) {
      if (!r.mapped) detailGrid.disableCell(r.rowKey, 'weight');
    }
    refreshOverall();
  }

  /** 디테일 그리드에서 고친 값을 구분별 보관소에 반영 */
  function stashDetail() {
    if (selectedCategoryId === null || !detailGrid) return;
    detailGrid.finishEditing();
    detailByCategory[selectedCategoryId] = detailGrid.getData().map((/** @type {any} */ r) => ({
      stockId: r.stockId, ticker: r.ticker, stockName: r.stockName, valueKrw: r.valueKrw, weight: trimmed(r.weight), mapped: r.mapped, status: r.status
    }));
  }

  /** 구분의 세부비율 입력 상태: none(모두 빈 칸) / 합계(만분율) @param {number} categoryId */
  function detailState(categoryId) {
    const rows = (detailByCategory[categoryId] ?? []).filter((r) => r.mapped);
    const entered = rows.some((r) => trimmed(r.weight) !== '');
    return { entered, total: rows.reduce((sum, r) => sum + toUnits(r.weight), 0), count: rows.length };
  }

  /** @param {number|null} categoryId */
  function refreshDetailLabel(categoryId) {
    if (categoryId === null || !masterGrid) return;
    const row = masterGrid.getData().find((/** @type {any} */ r) => r.categoryId === categoryId);
    if (!row) return;
    const s = detailState(categoryId);
    const label = s.count === 0 ? '-' : !s.entered ? '미입력' : s.total === 100 * SCALE ? '100% ✔' : `${pct(s.total)} ⚠`;
    masterGrid.setValue(row.rowKey, 'detailLabel', label, false);
  }

  function refreshMasterTotal() {
    masterTotal = (masterGrid?.getData() ?? []).reduce((/** @type {number} */ sum, /** @type {any} */ r) => sum + toUnits(r.weight), 0);
  }

  /** 디테일의 '전체 대비' = 구분 목표비율 × 세부비율 / 100 */
  function refreshOverall() {
    if (!detailGrid || !masterGrid) return;
    const master = masterGrid.getData().find((/** @type {any} */ r) => r.categoryId === selectedCategoryId);
    const categoryUnits = master ? toUnits(master.weight) : 0;
    for (const r of detailGrid.getData()) {
      const value = r.mapped && trimmed(r.weight) !== '' ? `${Math.round((categoryUnits * toUnits(r.weight)) / (100 * SCALE)) / SCALE}` : '';
      detailGrid.setValue(r.rowKey, 'overall', value, false);
    }
  }

  const selectedDetail = $derived.by(() => {
    void revision;
    return selectedCategoryId === null ? null : detailState(selectedCategoryId);
  });

  // ==================== 이동 / 저장 ====================

  function confirmDiscard() {
    masterGrid?.finishEditing();
    stashDetail();
    return !dirty || confirm('저장하지 않은 변경이 있습니다. 무시하고 진행할까요?');
  }

  function handlePortfolioChange() {
    if (!confirmDiscard()) {
      portfolioId = loadedPortfolioId; // 선택을 되돌린다
      return;
    }
    selectedCategoryId = null;
    loadAll();
  }

  function handleVersionChange() {
    if (!confirmDiscard()) {
      versionId = loadedVersionId;
      return;
    }
    loadAll(versionId); // 종목 연결이 바뀌었을 수 있어 다시 불러온다
  }

  function handleSearch() {
    if (confirmDiscard()) loadAll(versionId);
  }

  /** 입력값을 검증하고 저장 본문(items, stockItems)을 만든다. 문제가 있으면 메시지 문자열 */
  function buildPayload() {
    masterGrid.finishEditing();
    stashDetail();
    const master = /** @type {any[]} */ (masterGrid.getData());
    for (const r of master) {
      if (!isNumeric(r.weight) || toUnits(r.weight) > 100 * SCALE) return `'${r.name}' 목표비율은 0~100 사이 숫자로 입력하세요.`;
    }
    const total = master.reduce((sum, r) => sum + toUnits(r.weight), 0);
    if (total !== 100 * SCALE) return `구분별 목표비율 합계가 100이어야 합니다. (현재 ${total / SCALE})`;

    /** @type {any[]} */
    const stockItems = [];
    for (const c of categories) {
      const rows = (detailByCategory[c.categoryId] ?? []).filter((r) => r.mapped);
      for (const r of rows) {
        if (!isNumeric(r.weight) || toUnits(r.weight) > 100 * SCALE) return `'${c.name}' 구분의 '${r.stockName}' 세부비율은 0~100 사이 숫자로 입력하세요.`;
      }
      const s = detailState(c.categoryId);
      if (!s.entered) continue; // 미입력 구분은 세부비율 없이 저장
      if (s.total !== 100 * SCALE) return `'${c.name}' 구분의 종목 세부비율 합계가 100이어야 합니다. (현재 ${s.total / SCALE})\n세부비율을 쓰지 않으려면 모두 비우세요.`;
      for (const r of rows) stockItems.push({ categoryId: c.categoryId, stockId: r.stockId, targetWeight: toUnits(r.weight) / SCALE });
    }
    return {
      items: master.map((r) => ({ categoryId: r.categoryId, targetWeight: toUnits(r.weight) / SCALE })),
      stockItems
    };
  }

  /** @param {'update'|'create'} mode */
  function openSave(mode) {
    if (!portfolioId) return alert('포트폴리오를 먼저 선택하세요. (포트폴리오 관리에서 등록)');
    const version = currentVersion();
    if (mode === 'update' && !version) return alert('저장할 기존 버전이 없습니다. [새 버전 저장]으로 등록하세요.');
    const payload = buildPayload();
    if (typeof payload === 'string') return alert(payload);
    saveForm = mode === 'update'
      ? { mode, effectiveDate: version.effectiveDate, memo: version.memo ?? '' }
      : { mode, effectiveDate: today(), memo: '' };
    isSaveOpen = true;
  }

  async function save() {
    const payload = buildPayload();
    if (typeof payload === 'string') return alert(payload);
    if (!saveForm.effectiveDate) {
      alert('적용일을 입력하세요.');
      await tick(); // Modal이 onSave 호출 직후 닫으므로, 닫힌 뒤 다시 연다
      isSaveOpen = true;
      return;
    }
    try {
      const memo = saveForm.memo.trim() || null;
      if (saveForm.mode === 'update') {
        await portfolioApi.updateTarget(portfolioId, versionId, { memo, ...payload });
        await loadAll(versionId);
      } else {
        const saved = await portfolioApi.createTarget(portfolioId, { effectiveDate: saveForm.effectiveDate, memo, ...payload });
        await loadAll(String(saved?.versionId ?? ''));
      }
    } catch (error) {
      console.error('Failed to save target version:', error);
      alert(`저장에 실패했습니다.\n${errorMessage(error)}`);
      isSaveOpen = true; // 입력값을 유지한 채 팝업을 다시 연다
    }
  }

  async function removeVersion() {
    const version = currentVersion();
    if (!version) return alert('삭제할 버전이 없습니다.');
    if (!confirm(`적용일 ${version.effectiveDate} 버전을 삭제할까요?\n삭제하면 그 이전 버전이 다시 적용됩니다.`)) return;
    try {
      await portfolioApi.removeTarget(portfolioId, version.versionId);
    } catch (error) {
      console.error('Failed to remove target version:', error);
      alert(`삭제에 실패했습니다.\n${errorMessage(error)}`);
    }
    await loadAll();
  }

  const inputClass = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2';
</script>

<div class="absolute inset-0 flex flex-col p-4 gap-3">
  <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
      <LookupComboBox
        id="tw-portfolio"
        label="포트폴리오"
        class="sm:col-span-1 lg:col-span-2"
        options={portfolioOptions}
        bind:value={portfolioId}
        placeholder={portfolioOptions.length === 0 ? '등록된 포트폴리오 없음' : ''}
        onchange={handlePortfolioChange}
      />
      <LookupComboBox
        id="tw-version"
        label="기준 버전 (적용일)"
        class="sm:col-span-1 lg:col-span-2"
        options={versionOptions}
        bind:value={versionId}
        placeholder={versions.length === 0 ? '버전 없음 — 새로 입력' : ''}
        onchange={handleVersionChange}
      />
      <div class="sm:col-span-1 lg:col-span-2 text-xs text-gray-400">
        기준 버전의 비율을 불러와 ✎ 컬럼을 더블클릭해 고친 뒤 [저장]은 기준 버전에 덮어쓰고, [새 버전 저장]은 새 적용일 버전으로 저장합니다.
      </div>
    </div>
  </div>

  <div class="flex items-center justify-between">
    <h2 class="text-sm font-semibold text-gray-700">포트폴리오 비율관리 {#if dirty}<span class="ml-2 text-xs font-medium text-amber-600">저장하지 않은 변경 있음</span>{/if}</h2>
    <div class="flex gap-2">
      <UiButton label="Search" color={BUTTON_COLORS.INDIGO} iconType="search" onclick={handleSearch} />
      <UiButton label="저장" color={BUTTON_COLORS.BLUE} iconType="save" onclick={() => openSave('update')} />
      <UiButton label="새 버전 저장" color={BUTTON_COLORS.EMERALD} iconType="add" onclick={() => openSave('create')} />
      <UiButton label="버전 삭제" color={BUTTON_COLORS.ROSE} iconType="remove" onclick={removeVersion} />
    </div>
  </div>

  <div class="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
    <!-- 마스터: 구분별 목표비율 -->
    <section class="lg:w-5/12 min-h-[240px] flex-1 lg:flex-none flex flex-col bg-white rounded-lg shadow overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span class="text-sm font-semibold text-gray-700">구분별 목표비율</span>
        <span class="text-sm">
          합계 <span class="font-semibold {masterTotal === 100 * SCALE ? 'text-emerald-600' : 'text-rose-600'}">{pct(masterTotal)}</span>
          <span class="text-xs text-gray-400">(100 필요)</span>
        </span>
      </div>
      <div class="flex-1 min-h-0 relative"><div bind:this={masterEl} class="absolute inset-0"></div></div>
    </section>

    <!-- 디테일: 선택한 구분의 종목 세부비율 -->
    <section class="lg:w-7/12 min-h-[240px] flex-1 lg:flex-none flex flex-col bg-white rounded-lg shadow overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 gap-2">
        <div class="min-w-0">
          <span class="text-sm font-semibold text-gray-700">종목 세부비율 — {selectedCategory?.name ?? '-'}</span>
          <p class="text-xs text-gray-400 truncate">
            {#if selectedDetail && selectedDetail.count === 0}
              <span class="text-amber-600">이 구분에 연결된 종목이 없습니다. '목표비율&lt;-> 종목 연결'에서 연결하세요.</span>
            {:else if selectedCategory?.isCash}
              현금 잔액은 종목이 아니라 세부비율 대상이 아닙니다. 연결된 현금성 종목끼리의 비율만 넣습니다.
            {:else}
              구분 비율 대비 %. 선택 입력 — 하나라도 넣으면 합 100 (빈 칸 = 0), 쓰지 않으려면 모두 비웁니다.
            {/if}
          </p>
        </div>
        {#if selectedDetail && selectedDetail.count > 0}
          <span class="text-sm shrink-0">
            {#if selectedDetail.entered}
              합계 <span class="font-semibold {selectedDetail.total === 100 * SCALE ? 'text-emerald-600' : 'text-rose-600'}">{pct(selectedDetail.total)}</span>
            {:else}
              <span class="text-gray-400">미입력</span>
            {/if}
          </span>
        {/if}
      </div>
      <div class="flex-1 min-h-0 relative"><div bind:this={detailEl} class="absolute inset-0"></div></div>
    </section>
  </div>
</div>

<Modal bind:isOpen={isSaveOpen} title={saveForm.mode === 'update' ? '기준 버전에 저장' : '새 버전 저장'} width="max-w-md" onSave={save}>
  <div>
    <label for="tw-date" class="block text-sm font-medium text-gray-700 mb-1">적용일</label>
    <input id="tw-date" type="date" bind:value={saveForm.effectiveDate} disabled={saveForm.mode === 'update'} class="{inputClass} disabled:bg-gray-100 disabled:text-gray-500" />
  </div>
  <div>
    <label for="tw-memo" class="block text-sm font-medium text-gray-700 mb-1">메모</label>
    <input id="tw-memo" type="text" bind:value={saveForm.memo} class={inputClass} />
  </div>
  {#if saveForm.mode === 'update'}
    <p class="text-xs text-amber-600">적용일 {saveForm.effectiveDate} 버전의 비율을 지금 값으로 덮어씁니다. 수정 전 값은 남지 않습니다.</p>
  {:else}
    <p class="text-xs text-gray-400">같은 적용일의 버전이 이미 있으면 저장되지 않습니다. 기존 버전을 고치려면 [저장]을 쓰세요.</p>
  {/if}
</Modal>
