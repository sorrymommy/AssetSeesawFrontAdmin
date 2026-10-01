<script>
  /**
   * 포트폴리오 관리 [구현]
   * 목록 기본 / 등록·수정 팝업 / [계좌 연결관리] 버튼 → 팝업
   * API: portfolioApi (/portfolios CRUD, /portfolios/{id}/accounts)
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  // import { portfolioApi } from '$lib/api/portfolioApi';  // 연동 단계에서 활성화

  const columns = [
    { header: '이름', name: 'name', sortable: true },
    { header: '설명', name: 'description', minWidth: 240 },
    { header: '연결 계좌수', name: 'accountCount', align: 'center', width: 110 },
    { header: '활성', name: 'isActive', align: 'center', width: 80 },
    { header: '생성일', name: 'createdAt', align: 'center', sortable: true }
  ];

  let isEditOpen = $state(false);
  let isLinkOpen = $state(false);
  let form = $state({ name: '', description: '', isActive: true });

  function openAdd() {
    form = { name: '', description: '', isActive: true };
    isEditOpen = true;
  }
  /** @param {any} row */
  function openEdit(row) {
    form = { name: row.name ?? '', description: row.description ?? '', isActive: row.isActive ?? true };
    isEditOpen = true;
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: () => {} },
    { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
    { label: '계좌 연결관리', color: BUTTON_COLORS.PURPLE, onClick: () => (isLinkOpen = true) },
    { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: () => {} }
  ];
</script>

<StandardListPage title="포트폴리오 관리" {columns} data={[]} {actions} onRowDblClick={openEdit}>
  <Modal bind:isOpen={isEditOpen} title="포트폴리오 등록/수정" onSave={() => { /* TODO: portfolioApi.create/update */ }}>
    <div>
      <label for="pf-name" class="block text-sm font-medium text-gray-700 mb-1">이름</label>
      <input id="pf-name" type="text" bind:value={form.name} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2" />
    </div>
    <div>
      <label for="pf-desc" class="block text-sm font-medium text-gray-700 mb-1">설명</label>
      <textarea id="pf-desc" bind:value={form.description} rows="3" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"></textarea>
    </div>
    <label class="inline-flex items-center gap-2 cursor-pointer">
      <input type="checkbox" bind:checked={form.isActive} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
      <span class="text-sm text-gray-700">활성</span>
    </label>
  </Modal>

  <Modal bind:isOpen={isLinkOpen} title="계좌 연결관리" width="max-w-lg" onSave={() => { /* TODO: 계좌 연결 동기화 (update accountIds) */ }}>
    <p class="text-sm text-gray-500">이 포트폴리오에 연결할 계좌를 선택합니다. (한 계좌는 동시에 하나의 포트폴리오에만 귀속)</p>
    <div class="border border-gray-200 rounded-md p-3 text-sm text-gray-400 min-h-[120px] flex items-center justify-center">
      계좌 선택 목록 (연동 예정)
    </div>
  </Modal>
</StandardListPage>
