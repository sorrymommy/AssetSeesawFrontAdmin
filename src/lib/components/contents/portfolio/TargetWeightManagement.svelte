<script>
  /**
   * 목표비율 관리 [구현]
   * 포트폴리오 선택 → 목표비율 '구분'(예: 국내주식, 채권, 현금) 관리 + 구분별 비율 버전 목록/등록/상세/삭제
   * 종목을 직접 지정하지 않는다 — 보유 종목은 '종목 구분 연결' 화면에서 구분에 연결한다.
   * API: portfolioApi.list / categories·createCategory·updateCategory·removeCategory / targets·createTarget·removeTarget
   * 규칙: 버전에는 살아있는 모든 구분(현금 포함)의 비율을 넣고 합 = 100 (0 허용). 버전은 수정 불가(이력 보존).
   */
  import { tick } from 'svelte';
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { portfolioApi } from '$lib/api/portfolioApi';
  import { kstDateFormatter } from '$lib/utils/date';

  /** 비중은 소수 4자리까지 — 합계 비교는 정수(만분율)로 해서 부동소수 오차를 피한다 */
  const SCALE = 10000;
  /** @param {any} v */
  const toUnits = (v) => Math.round(Number(v || 0) * SCALE);

  const columns = [
    { header: '적용일', name: 'effectiveDate', align: 'center', width: 110, sortable: true },
    { header: '구분별 목표비율', name: 'itemsSummary', minWidth: 360 },
    { header: '메모', name: 'memo', minWidth: 160 },
    { header: '등록일', name: 'createdAt', align: 'center', width: 110, formatter: kstDateFormatter }
  ];

  /** @type {any} */
  let grid;
  /** @type {Array<{value:any,label:string}>} */
  let portfolioOptions = $state([]);
  let portfolioId = $state('');
  /** @type {any[]} 살아있는 구분 (정렬순서) */
  let categories = $state([]);
  /** @type {any[]} 현재 포트폴리오의 버전 (적용일 내림차순) */
  let versions = [];

  // 구분 관리 팝업
  let isCategoryOpen = $state(false);
  /** @type {Array<{categoryId:number, name:string, sortOrder:any, isCash:boolean}>} 편집용 사본 */
  let categoryRows = $state([]);
  let newCategoryName = $state('');

  // 버전 등록 / 상세 팝업
  let isAddOpen = $state(false);
  let isDetailOpen = $state(false);
  /** @type {any} */
  let detail = $state(null);
  let form = $state({ effectiveDate: '', memo: '', weights: /** @type {Array<{categoryId:number, name:string, isCash:boolean, weight:any}>} */ ([]) });
  const totalUnits = $derived(form.weights.reduce((sum, w) => sum + toUnits(w.weight), 0));

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
        await loadAll();
      }
    } catch (error) {
      console.error('Failed to load portfolios:', error);
      alert(`포트폴리오 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  async function loadAll() {
    if (!portfolioId) {
      categories = [];
      versions = [];
      grid?.resetData([]);
      return;
    }
    try {
      const [cats, vers] = await Promise.all([portfolioApi.categories(portfolioId), portfolioApi.targets(portfolioId)]);
      categories = cats ?? [];
      versions = vers ?? [];
      grid?.resetData(
        versions.map((v) => ({
          ...v,
          itemsSummary: (v.items ?? [])
            .map((/** @type {any} */ i) => `${i.categoryName ?? i.categoryId}${i.categoryDeleted ? '(삭제됨)' : ''} ${Number(i.targetWeight)}%`)
            .join(', ')
        }))
      );
    } catch (error) {
      console.error('Failed to load targets:', error);
      alert(`목표비율 정보를 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  // ==================== 구분 관리 ====================

  function openCategories() {
    if (!portfolioId) {
      alert('포트폴리오를 먼저 선택하세요. (포트폴리오 관리에서 등록)');
      return;
    }
    categoryRows = categories.map((c) => ({ categoryId: c.categoryId, name: c.name, sortOrder: c.sortOrder, isCash: c.isCash }));
    newCategoryName = '';
    isCategoryOpen = true;
  }

  async function refreshCategoryRows() {
    await loadAll();
    categoryRows = categories.map((c) => ({ categoryId: c.categoryId, name: c.name, sortOrder: c.sortOrder, isCash: c.isCash }));
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      await portfolioApi.createCategory(portfolioId, { name });
      newCategoryName = '';
      await refreshCategoryRows();
    } catch (error) {
      alert(`구분을 추가하지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  /** @param {{categoryId:number, name:string, sortOrder:any}} row */
  async function saveCategory(row) {
    const name = row.name.trim();
    if (!name) {
      alert('구분명을 입력하세요.');
      return;
    }
    try {
      await portfolioApi.updateCategory(portfolioId, row.categoryId, { name, sortOrder: Number(row.sortOrder) || 0 });
      await refreshCategoryRows();
    } catch (error) {
      alert(`구분을 저장하지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  /** @param {{categoryId:number, name:string}} row */
  async function deleteCategory(row) {
    if (!confirm(`'${row.name}' 구분을 삭제할까요?`)) return;
    try {
      await portfolioApi.removeCategory(portfolioId, row.categoryId);
      await refreshCategoryRows();
    } catch (error) {
      alert(`구분을 삭제하지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  // ==================== 목표비율 버전 ====================

  /** 새 버전 등록 — 구분마다 비율 입력칸, 가장 최근 버전의 비율로 채워서 연다(새 구분은 0) */
  function openAdd() {
    if (!portfolioId) {
      alert('포트폴리오를 먼저 선택하세요. (포트폴리오 관리에서 등록)');
      return;
    }
    const latest = versions[0];
    /** @type {Record<number, any>} */
    const latestWeights = {};
    for (const i of latest?.items ?? []) latestWeights[i.categoryId] = Number(i.targetWeight);
    form = {
      effectiveDate: today(),
      memo: '',
      weights: categories.map((c) => ({
        categoryId: c.categoryId,
        name: c.name,
        isCash: c.isCash,
        weight: String(latestWeights[c.categoryId] ?? (latest ? 0 : c.isCash ? 100 : 0))
      }))
    };
    isAddOpen = true;
  }

  /** @param {any} row */
  function openDetail(row) {
    detail = versions.find((v) => v.versionId === row.versionId) ?? null;
    if (detail) isDetailOpen = true;
  }

  /** 검증 실패 시 Modal이 닫힌 뒤 다시 연다 @param {string} message */
  async function reject(message) {
    alert(message);
    await tick();
    isAddOpen = true;
  }

  async function save() {
    if (!form.effectiveDate) return reject('적용일을 입력하세요.');
    for (const w of form.weights) {
      const units = toUnits(w.weight);
      if (units < 0 || units > 100 * SCALE) return reject(`'${w.name}' 비율은 0~100 사이여야 합니다.`);
    }
    if (totalUnits !== 100 * SCALE) return reject(`구분별 비율 합계가 100이어야 합니다. (현재 ${totalUnits / SCALE})`);

    try {
      await portfolioApi.createTarget(portfolioId, {
        effectiveDate: form.effectiveDate,
        memo: form.memo.trim() || null,
        items: form.weights.map((w) => ({ categoryId: w.categoryId, targetWeight: toUnits(w.weight) / SCALE }))
      });
      await loadAll();
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
    await loadAll();
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: loadAll },
    { label: '구분 관리', color: BUTTON_COLORS.PURPLE, onClick: openCategories },
    { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
    { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: removeChecked }
  ];

  const inputClass = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2';
  const cellInputClass = 'rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-2 py-1.5';
</script>

<StandardListPage title="목표비율 관리" {columns} {actions} onReady={handleReady} onRowDblClick={openDetail}>
  {#snippet filters()}
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
      <LookupComboBox
        id="tw-portfolio"
        label="포트폴리오"
        class="sm:col-span-2"
        options={portfolioOptions}
        bind:value={portfolioId}
        placeholder={portfolioOptions.length === 0 ? '등록된 포트폴리오 없음' : ''}
        onchange={loadAll}
      />
      <div class="sm:col-span-1 lg:col-span-4 text-xs text-gray-500">
        구분: {categories.map((c) => c.name).join(', ') || '-'}
      </div>
    </div>
  {/snippet}

  <!-- 구분 관리 -->
  <Modal bind:isOpen={isCategoryOpen} title="목표비율 구분 관리" width="max-w-lg">
    <p class="text-sm text-gray-500">목표비율을 나눌 구분을 관리합니다. '현금'은 기본 구분으로 삭제할 수 없고, 계좌의 현금 잔액이 이 구분으로 계산됩니다.</p>
    <table class="w-full text-sm">
      <thead class="text-gray-500">
        <tr><th class="text-left font-medium pb-1">구분명</th><th class="text-left font-medium pb-1 w-20">순서</th><th class="w-28"></th></tr>
      </thead>
      <tbody>
        {#each categoryRows as row (row.categoryId)}
          <tr class="border-t border-gray-100">
            <td class="py-1.5 pr-2">
              <input type="text" maxlength="50" bind:value={row.name} aria-label="구분명" class="{cellInputClass} w-full" />
            </td>
            <td class="py-1.5 pr-2">
              <input type="number" step="1" bind:value={row.sortOrder} aria-label="정렬순서" class="{cellInputClass} w-full text-right" />
            </td>
            <td class="py-1.5 text-right whitespace-nowrap">
              <button type="button" onclick={() => saveCategory(row)} class="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-1">저장</button>
              {#if row.isCash}
                <span class="text-xs text-gray-400 px-1">기본</span>
              {:else}
                <button type="button" onclick={() => deleteCategory(row)} class="text-xs font-medium text-rose-600 hover:text-rose-800 px-1">삭제</button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <form class="flex gap-2" onsubmit={(e) => { e.preventDefault(); addCategory(); }}>
      <input type="text" maxlength="50" bind:value={newCategoryName} placeholder="새 구분명 (예: 국내주식, 채권, 금)" aria-label="새 구분명" class="{cellInputClass} flex-1" />
      <button type="submit" class="rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700">추가</button>
    </form>
    <p class="text-xs text-gray-400">새 구분은 다음 버전부터 비율을 넣습니다. 종목이 연결돼 있거나 최근 버전에서 비율이 0보다 큰 구분은 삭제할 수 없습니다.</p>
  </Modal>

  <!-- 버전 등록 -->
  <Modal bind:isOpen={isAddOpen} title="목표비율 버전 등록" width="max-w-lg" onSave={save}>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="tw-date" class="block text-sm font-medium text-gray-700 mb-1">적용일</label>
        <input id="tw-date" type="date" bind:value={form.effectiveDate} class={inputClass} />
      </div>
      <div>
        <label for="tw-memo" class="block text-sm font-medium text-gray-700 mb-1">메모</label>
        <input id="tw-memo" type="text" bind:value={form.memo} class={inputClass} />
      </div>
    </div>
    <div>
      <span class="block text-sm font-medium text-gray-700 mb-1">구분별 목표비율 (%)</span>
      <div class="border border-gray-200 rounded-md divide-y divide-gray-100">
        {#each form.weights as w (w.categoryId)}
          <label class="flex items-center gap-3 p-2">
            <span class="flex-1 text-sm text-gray-700">{w.name}{w.isCash ? ' (기본)' : ''}</span>
            <input type="number" min="0" max="100" step="0.0001" bind:value={w.weight} aria-label="{w.name} 비율" class="{cellInputClass} w-28 text-right" />
          </label>
        {/each}
      </div>
      <div class="mt-2 text-right text-sm">
        합계
        <span class="font-semibold {totalUnits === 100 * SCALE ? 'text-emerald-600' : 'text-rose-600'}">{totalUnits / SCALE}%</span>
        <span class="text-xs text-gray-400">(100 필요)</span>
      </div>
    </div>
  </Modal>

  <!-- 버전 상세 -->
  <Modal bind:isOpen={isDetailOpen} title="목표비율 버전 상세" width="max-w-lg">
    {#if detail}
      <dl class="grid grid-cols-3 gap-2 text-sm">
        <dt class="text-gray-500">적용일</dt><dd class="col-span-2">{detail.effectiveDate}</dd>
        <dt class="text-gray-500">메모</dt><dd class="col-span-2">{detail.memo ?? ''}</dd>
      </dl>
      <table class="w-full text-sm border border-gray-200 rounded-md">
        <thead class="bg-gray-50 text-gray-600">
          <tr><th class="text-left p-2">구분</th><th class="text-right p-2">목표비율</th></tr>
        </thead>
        <tbody>
          {#each detail.items ?? [] as i (i.categoryId)}
            <tr class="border-t border-gray-100">
              <td class="p-2">{i.categoryName ?? i.categoryId}{i.categoryDeleted ? ' (삭제된 구분)' : ''}</td>
              <td class="p-2 text-right">{Number(i.targetWeight)}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="text-xs text-gray-400">버전은 수정할 수 없습니다. 비율을 바꾸려면 새 적용일로 버전을 추가하세요.</p>
    {/if}
  </Modal>
</StandardListPage>
