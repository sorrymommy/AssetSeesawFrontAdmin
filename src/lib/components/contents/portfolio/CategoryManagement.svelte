<script>
  /**
   * 목표비율명 관리 [구현]
   * 포트폴리오 선택 → 목표비율 '구분'(예: 국내주식, 채권, 현금) 목록 / 등록·수정 팝업 / 삭제
   * 구분별 비율은 '포트폴리오 비율관리', 보유 종목의 구분 지정은 '목표비율<-> 종목 연결' 화면에서 한다.
   * API: portfolioApi.list / categories·createCategory·updateCategory·removeCategory
   * 규칙: '현금'은 포트폴리오 생성 시 자동 생성되는 기본 구분으로 삭제 불가.
   *       종목이 연결돼 있거나 최근 버전에서 비율이 0보다 큰 구분은 삭제 불가 (서버 검증).
   */
  import { tick } from 'svelte';
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { portfolioApi } from '$lib/api/portfolioApi';
  import { kstDateFormatter } from '$lib/utils/date';

  const columns = [
    { header: '구분명', name: 'name', minWidth: 200, sortable: true },
    { header: '정렬순서', name: 'sortOrder', align: 'right', width: 100, sortable: true },
    { header: '기본', name: 'isCash', align: 'center', width: 100, formatter: (/** @type {any} */ { value }) => (value ? '기본(현금)' : '') },
    { header: '등록일', name: 'createdAt', align: 'center', width: 110, formatter: kstDateFormatter }
  ];

  /** @type {any} */
  let grid;
  /** @type {Array<{value:any,label:string}>} */
  let portfolioOptions = $state([]);
  let portfolioId = $state('');

  let isEditOpen = $state(false);
  /** @type {number|null} 수정 대상 id (null = 신규) */
  let editingId = $state(null);
  let form = $state({ name: '', sortOrder: /** @type {any} */ (''), isCash: false });

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
        await loadCategories();
      }
    } catch (error) {
      console.error('Failed to load portfolios:', error);
      alert(`포트폴리오 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  async function loadCategories() {
    if (!portfolioId) {
      grid?.resetData([]);
      return;
    }
    try {
      grid?.resetData((await portfolioApi.categories(portfolioId)) ?? []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      alert(`구분 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  function openAdd() {
    if (!portfolioId) {
      alert('포트폴리오를 먼저 선택하세요. (포트폴리오 관리에서 등록)');
      return;
    }
    editingId = null;
    form = { name: '', sortOrder: '', isCash: false };
    isEditOpen = true;
  }

  /** @param {any} row */
  function openEdit(row) {
    editingId = row.categoryId;
    form = { name: row.name ?? '', sortOrder: row.sortOrder ?? 0, isCash: row.isCash ?? false };
    isEditOpen = true;
  }

  /** 검증 실패 시 Modal이 닫힌 뒤 다시 연다 @param {string} message */
  async function reject(message) {
    alert(message);
    await tick();
    isEditOpen = true;
  }

  async function save() {
    const name = form.name.trim();
    if (!name) return reject('구분명을 입력하세요.');
    const sortOrderText = String(form.sortOrder ?? '').trim();
    try {
      if (editingId === null) {
        // 정렬순서를 비우면 서버가 마지막 순서 다음으로 넣는다
        await portfolioApi.createCategory(portfolioId, { name, sortOrder: sortOrderText === '' ? null : Number(sortOrderText) });
      } else {
        await portfolioApi.updateCategory(portfolioId, editingId, { name, sortOrder: Number(sortOrderText) || 0 });
      }
      await loadCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      alert(`저장에 실패했습니다.\n${errorMessage(error)}`);
      isEditOpen = true; // 입력값을 유지한 채 팝업을 다시 연다
    }
  }

  async function removeChecked() {
    const rows = grid?.getCheckedRows() ?? [];
    if (rows.length === 0) {
      alert('삭제할 구분을 선택하세요.');
      return;
    }
    if (rows.some((/** @type {any} */ r) => r.isCash)) {
      alert("'현금' 구분은 기본 구분이라 삭제할 수 없습니다.");
      return;
    }
    const names = rows.map((/** @type {any} */ r) => `'${r.name}'`).join(', ');
    if (!confirm(`${names} 구분을 삭제할까요?`)) return;
    /** @type {string[]} */
    const failures = [];
    for (const row of rows) {
      try {
        await portfolioApi.removeCategory(portfolioId, row.categoryId);
      } catch (error) {
        failures.push(`${row.name}: ${errorMessage(error)}`);
      }
    }
    if (failures.length > 0) alert(`일부 구분을 삭제하지 못했습니다.\n${failures.join('\n')}`);
    await loadCategories();
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: loadCategories },
    { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
    { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: removeChecked }
  ];

  const inputClass = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2';
</script>

<StandardListPage title="목표비율명 관리" {columns} {actions} onReady={handleReady} onRowDblClick={openEdit}>
  {#snippet filters()}
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
      <LookupComboBox
        id="cat-portfolio"
        label="포트폴리오"
        class="sm:col-span-2"
        options={portfolioOptions}
        bind:value={portfolioId}
        placeholder={portfolioOptions.length === 0 ? '등록된 포트폴리오 없음' : ''}
        onchange={loadCategories}
      />
      <div class="sm:col-span-1 lg:col-span-4 text-xs text-gray-500">
        목표비율을 나눌 구분을 관리합니다. '현금'은 기본 구분으로 삭제할 수 없고, 계좌의 현금 잔액이 이 구분으로 계산됩니다.
        새 구분은 포트폴리오 비율관리에서 다음 버전부터 비율을 넣습니다.
      </div>
    </div>
  {/snippet}

  <Modal bind:isOpen={isEditOpen} title={editingId === null ? '구분 등록' : '구분 수정'} width="max-w-md" onSave={save}>
    <div>
      <label for="cat-name" class="block text-sm font-medium text-gray-700 mb-1">구분명</label>
      <input id="cat-name" type="text" maxlength="50" bind:value={form.name} placeholder="예: 국내주식, 채권, 금" class={inputClass} />
    </div>
    <div>
      <label for="cat-sort" class="block text-sm font-medium text-gray-700 mb-1">정렬순서</label>
      <input id="cat-sort" type="number" step="1" bind:value={form.sortOrder} placeholder={editingId === null ? '비우면 마지막 순서' : ''} class="{inputClass} text-right" />
    </div>
    {#if form.isCash}
      <p class="text-xs text-gray-400">기본(현금) 구분입니다. 이름과 순서는 바꿀 수 있지만 삭제할 수 없습니다.</p>
    {:else}
      <p class="text-xs text-gray-400">종목이 연결돼 있거나 최근 버전에서 비율이 0보다 큰 구분은 삭제할 수 없습니다.</p>
    {/if}
  </Modal>
</StandardListPage>
