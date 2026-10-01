<script>
  /**
   * 목표비율 관리 [구현]
   * 포트폴리오 선택 → 버전 목록 / 등록 팝업(버전 + 항목, cash_weight + Σtarget = 100 검증) / 상세 팝업(읽기 전용)
   * API: portfolioApi.list / targets / createTarget / removeTarget, stockApi.list
   * 버전은 수정하지 않는다(이력 보존) — 비율을 바꾸려면 새 적용일로 버전을 추가한다.
   */
  import { tick } from 'svelte';
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { portfolioApi } from '$lib/api/portfolioApi';
  import { stockApi } from '$lib/api/stockApi';

  /** 비중은 소수 4자리까지 — 합계 비교는 정수(만분율)로 해서 부동소수 오차를 피한다 */
  const SCALE = 10000;
  /** @param {any} v */
  const toUnits = (v) => Math.round(Number(v || 0) * SCALE);

  const columns = [
    { header: '적용일', name: 'effectiveDate', align: 'center', width: 110, sortable: true },
    { header: '현금비중(%)', name: 'cashWeight', align: 'right', width: 110 },
    { header: '종목수', name: 'itemCount', align: 'center', width: 80 },
    { header: '종목 구성', name: 'itemsSummary', minWidth: 300 },
    { header: '메모', name: 'memo', minWidth: 160 },
    { header: '등록일', name: 'createdAt', align: 'center', width: 110, formatter: (/** @type {any} */ { value }) => (value ? String(value).slice(0, 10) : '') }
  ];

  /** @type {any} */
  let grid;
  /** @type {Array<{value:any,label:string}>} */
  let portfolioOptions = $state([]);
  let portfolioId = $state('');
  /** @type {any[]} 현재 포트폴리오의 버전 (적용일 내림차순) */
  let versions = [];

  /** @type {any[]} 활성 종목 (등록 팝업 종목 선택용, 처음 열 때 1회 로드) */
  let stocks = $state([]);
  /** @type {Map<string, any>} datalist 표시 문자열 → 종목 */
  let stockByLabel = $derived(new Map(stocks.map((s) => [stockLabel(s), s])));

  let isAddOpen = $state(false);
  let isDetailOpen = $state(false);
  /** @type {any} */
  let detail = $state(null);
  let form = $state(emptyForm());

  /** @param {any} s */
  function stockLabel(s) {
    return `${s.ticker} ${s.name}`;
  }

  /**
   * 입력값 → 종목. 목록에서 고른 "티커 종목명" 외에, 티커나 종목명을 정확히 입력한 경우도 받는다.
   * @param {string} query
   */
  function resolveStock(query) {
    const q = query.trim();
    if (!q) return undefined;
    const byLabel = stockByLabel.get(q);
    if (byLabel) return byLabel;
    const matches = stocks.filter((s) => s.ticker === q || s.name === q);
    return matches.length === 1 ? matches[0] : undefined;
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function emptyForm() {
    return { effectiveDate: today(), cashWeight: '100', memo: '', items: /** @type {Array<{query:string, weight:string}>} */ ([]) };
  }

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
        await loadVersions();
      }
    } catch (error) {
      console.error('Failed to load portfolios:', error);
      alert(`포트폴리오 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  async function loadVersions() {
    if (!portfolioId) {
      versions = [];
      grid?.resetData([]);
      return;
    }
    try {
      versions = (await portfolioApi.targets(portfolioId)) ?? [];
      grid?.resetData(
        versions.map((v) => ({
          ...v,
          itemCount: v.items?.length ?? 0,
          itemsSummary: (v.items ?? [])
            .map((/** @type {any} */ i) => `${i.stock?.name ?? i.stockId} ${Number(i.targetWeight)}%`)
            .join(', ')
        }))
      );
    } catch (error) {
      console.error('Failed to load target versions:', error);
      alert(`목표비율 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  async function ensureStocks() {
    if (stocks.length > 0) return;
    const list = (await stockApi.list()) ?? [];
    stocks = list.filter((/** @type {any} */ s) => s.isActive);
  }

  /** 새 버전 등록 — 가장 최근 버전의 구성을 채워서 연다(일부만 바꾸는 경우가 대부분이라) */
  async function openAdd() {
    if (!portfolioId) {
      alert('포트폴리오를 먼저 선택하세요. (포트폴리오 관리에서 등록)');
      return;
    }
    try {
      await ensureStocks();
    } catch (error) {
      alert(`종목 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
      return;
    }
    const latest = versions[0];
    form = latest
      ? {
          effectiveDate: today(),
          cashWeight: String(Number(latest.cashWeight)),
          memo: '',
          items: (latest.items ?? []).map((/** @type {any} */ i) => ({
            query: i.stock ? stockLabel(i.stock) : '',
            weight: String(Number(i.targetWeight))
          }))
        }
      : emptyForm();
    isAddOpen = true;
  }

  /** @param {any} row */
  function openDetail(row) {
    detail = versions.find((v) => v.versionId === row.versionId) ?? null;
    if (detail) isDetailOpen = true;
  }

  function addItemRow() {
    form.items.push({ query: '', weight: '' });
  }

  /** @param {number} index */
  function removeItemRow(index) {
    form.items.splice(index, 1);
  }

  const totalUnits = $derived(toUnits(form.cashWeight) + form.items.reduce((sum, i) => sum + toUnits(i.weight), 0));

  /** 검증 실패 시 Modal이 닫힌 뒤 다시 연다 @param {string} message */
  async function reject(message) {
    alert(message);
    await tick();
    isAddOpen = true;
  }

  async function save() {
    if (!form.effectiveDate) return reject('적용일을 입력하세요.');

    const cash = toUnits(form.cashWeight);
    if (cash < 0 || cash > 100 * SCALE) return reject('현금비중은 0~100 사이여야 합니다.');

    /** @type {Array<{stockId:number, targetWeight:number}>} */
    const items = [];
    for (const [idx, row] of form.items.entries()) {
      const stock = resolveStock(row.query);
      if (!stock) return reject(`${idx + 1}번째 행: 목록에서 종목을 선택하세요.`);
      const w = toUnits(row.weight);
      if (w <= 0) return reject(`${idx + 1}번째 행(${stock.name}): 비율은 0보다 커야 합니다.`);
      if (items.some((i) => i.stockId === stock.stockId)) return reject(`${stock.name} 종목이 중복되었습니다.`);
      items.push({ stockId: stock.stockId, targetWeight: w / SCALE });
    }

    if (totalUnits !== 100 * SCALE) return reject(`현금 + 종목 비율 합계가 100이어야 합니다. (현재 ${totalUnits / SCALE})`);

    try {
      await portfolioApi.createTarget(portfolioId, {
        effectiveDate: form.effectiveDate,
        cashWeight: cash / SCALE,
        memo: form.memo.trim() || null,
        items
      });
      await loadVersions();
    } catch (error) {
      console.error('Failed to save target version:', error);
      alert(`저장에 실패했습니다.\n${errorMessage(error)}`);
      isAddOpen = true; // 입력값을 유지한 채 팝업을 다시 연다
    }
  }

  async function removeChecked() {
    const rows = grid?.getCheckedRows() ?? [];
    if (rows.length === 0) {
      alert('삭제할 버전을 선택하세요.');
      return;
    }
    const dates = rows.map((/** @type {any} */ r) => r.effectiveDate).join(', ');
    if (!confirm(`적용일 ${dates} 버전을 삭제할까요?\n삭제하면 그 이전 버전이 다시 적용됩니다.`)) return;
    try {
      for (const row of rows) {
        await portfolioApi.removeTarget(portfolioId, row.versionId);
      }
    } catch (error) {
      console.error('Failed to remove target version:', error);
      alert(`삭제에 실패했습니다.\n${errorMessage(error)}`);
    }
    await loadVersions();
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: loadVersions },
    { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
    { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: removeChecked }
  ];

  const fieldClass = 'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2';
  const inputClass = `block w-full ${fieldClass}`;
</script>

<StandardListPage title="목표비율 관리" {columns} {actions} onReady={handleReady} onRowDblClick={openDetail}>
  {#snippet filters()}
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <LookupComboBox
        id="tw-portfolio"
        label="포트폴리오"
        class="sm:col-span-2"
        options={portfolioOptions}
        bind:value={portfolioId}
        placeholder={portfolioOptions.length === 0 ? '등록된 포트폴리오 없음' : ''}
        onchange={loadVersions}
      />
    </div>
  {/snippet}

  <datalist id="tw-stock-list">
    {#each stocks as s (s.stockId)}
      <option value={stockLabel(s)}></option>
    {/each}
  </datalist>

  <Modal bind:isOpen={isAddOpen} title="목표비율 버전 등록" width="max-w-2xl" onSave={save}>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="tw-date" class="block text-sm font-medium text-gray-700 mb-1">적용일</label>
        <input id="tw-date" type="date" bind:value={form.effectiveDate} class={inputClass} />
      </div>
      <div>
        <label for="tw-cash" class="block text-sm font-medium text-gray-700 mb-1">현금비중 (%)</label>
        <input id="tw-cash" type="number" min="0" max="100" step="0.0001" bind:value={form.cashWeight} class={inputClass} />
      </div>
    </div>
    <div>
      <label for="tw-memo" class="block text-sm font-medium text-gray-700 mb-1">메모</label>
      <input id="tw-memo" type="text" bind:value={form.memo} class={inputClass} />
    </div>
    <div>
      <div class="flex items-center justify-between mb-1">
        <span class="block text-sm font-medium text-gray-700">종목별 목표비율</span>
        <button type="button" onclick={addItemRow} class="text-xs font-medium text-indigo-600 hover:text-indigo-800">+ 종목 추가</button>
      </div>
      <div class="border border-gray-200 rounded-md divide-y divide-gray-100">
        {#each form.items as item, idx (idx)}
          <div class="flex items-center gap-2 p-2">
            <input type="text" list="tw-stock-list" bind:value={item.query} placeholder="티커 또는 종목명 입력 후 선택" aria-label="{idx + 1}번째 종목" class="{fieldClass} min-w-0 flex-1" />
            <input type="number" min="0" max="100" step="0.0001" bind:value={item.weight} placeholder="%" aria-label="{idx + 1}번째 비율" class="{fieldClass} w-28 shrink-0 text-right" />
            <button type="button" onclick={() => removeItemRow(idx)} aria-label="{idx + 1}번째 행 삭제" class="text-gray-400 hover:text-rose-600 px-1">✕</button>
          </div>
        {:else}
          <p class="p-3 text-sm text-gray-400 text-center">종목이 없으면 현금비중이 100이어야 합니다.</p>
        {/each}
      </div>
      <div class="mt-2 text-right text-sm">
        합계
        <span class="font-semibold {totalUnits === 100 * SCALE ? 'text-emerald-600' : 'text-rose-600'}">{totalUnits / SCALE}%</span>
        <span class="text-xs text-gray-400">(현금 + 종목 = 100 필요)</span>
      </div>
    </div>
  </Modal>

  <Modal bind:isOpen={isDetailOpen} title="목표비율 버전 상세" width="max-w-lg">
    {#if detail}
      <dl class="grid grid-cols-3 gap-2 text-sm">
        <dt class="text-gray-500">적용일</dt><dd class="col-span-2">{detail.effectiveDate}</dd>
        <dt class="text-gray-500">현금비중</dt><dd class="col-span-2">{Number(detail.cashWeight)}%</dd>
        <dt class="text-gray-500">메모</dt><dd class="col-span-2">{detail.memo ?? ''}</dd>
      </dl>
      <table class="w-full text-sm border border-gray-200 rounded-md">
        <thead class="bg-gray-50 text-gray-600">
          <tr><th class="text-left p-2">티커</th><th class="text-left p-2">종목명</th><th class="text-right p-2">목표비율</th></tr>
        </thead>
        <tbody>
          {#each detail.items ?? [] as i (i.stockId)}
            <tr class="border-t border-gray-100">
              <td class="p-2">{i.stock?.ticker ?? ''}</td>
              <td class="p-2">{i.stock?.name ?? i.stockId}</td>
              <td class="p-2 text-right">{Number(i.targetWeight)}%</td>
            </tr>
          {:else}
            <tr><td colspan="3" class="p-3 text-center text-gray-400">종목 없음 (현금 100%)</td></tr>
          {/each}
        </tbody>
      </table>
      <p class="text-xs text-gray-400">버전은 수정할 수 없습니다. 비율을 바꾸려면 새 적용일로 버전을 추가하세요.</p>
    {/if}
  </Modal>
</StandardListPage>
