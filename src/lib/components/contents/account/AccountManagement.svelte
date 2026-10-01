<script>
  /**
   * 계좌 관리 [구현]
   * 목록 / 등록·수정 팝업
   * API: accountApi (/accounts CRUD)
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';

  const columns = [
    { header: '계좌명', name: 'name', sortable: true },
    { header: '증권사', name: 'broker', sortable: true },
    { header: '계좌번호', name: 'accountNumber', minWidth: 160 },
    { header: '활성', name: 'isActive', align: 'center', width: 80 },
    { header: '생성일', name: 'createdAt', align: 'center', sortable: true }
  ];

  let isOpen = $state(false);
  let form = $state({ name: '', broker: '', accountNumber: '', isActive: true });

  function openAdd() {
    form = { name: '', broker: '', accountNumber: '', isActive: true };
    isOpen = true;
  }
  /** @param {any} row */
  function openEdit(row) {
    form = { name: row.name ?? '', broker: row.broker ?? '', accountNumber: row.accountNumber ?? '', isActive: row.isActive ?? true };
    isOpen = true;
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: () => {} },
    { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
    { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: () => {} }
  ];
</script>

<StandardListPage title="계좌 관리" {columns} data={[]} {actions} onRowDblClick={openEdit}>
  <Modal bind:isOpen title="계좌 등록/수정" onSave={() => { /* TODO: accountApi.create/update */ }}>
    <div>
      <label for="ac-name" class="block text-sm font-medium text-gray-700 mb-1">계좌명</label>
      <input id="ac-name" type="text" bind:value={form.name} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2" />
    </div>
    <div>
      <label for="ac-broker" class="block text-sm font-medium text-gray-700 mb-1">증권사</label>
      <input id="ac-broker" type="text" bind:value={form.broker} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2" />
    </div>
    <div>
      <label for="ac-no" class="block text-sm font-medium text-gray-700 mb-1">계좌번호</label>
      <input id="ac-no" type="text" bind:value={form.accountNumber} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2" />
    </div>
    <label class="inline-flex items-center gap-2 cursor-pointer">
      <input type="checkbox" bind:checked={form.isActive} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
      <span class="text-sm text-gray-700">활성</span>
    </label>
  </Modal>
</StandardListPage>
