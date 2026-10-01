<script>
  /**
   * 목표비율 관리 [구현]
   * 목록(포트폴리오별 버전) / 등록 팝업(버전 + 항목, cash_weight + Σtarget = 100 검증)
   * API: portfolioApi.targets / createTarget
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';

  const columns = [
    { header: '포트폴리오', name: 'portfolio', sortable: true },
    { header: '버전', name: 'versionId', align: 'center', width: 80 },
    { header: '적용일', name: 'effectiveDate', align: 'center', sortable: true },
    { header: '현금비중(%)', name: 'cashWeight', align: 'right', width: 120 },
    { header: '종목수', name: 'itemCount', align: 'center', width: 80 },
    { header: '메모', name: 'memo', minWidth: 200 }
  ];

  let isOpen = $state(false);
  let form = $state({ effectiveDate: '', cashWeight: 0, memo: '' });

  function openAdd() {
    form = { effectiveDate: '', cashWeight: 0, memo: '' };
    isOpen = true;
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: () => {} },
    { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
    { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: () => {} }
  ];
</script>

<StandardListPage title="목표비율 관리" {columns} data={[]} {actions} onRowDblClick={openAdd}>
  <Modal bind:isOpen title="목표비율 버전 등록" width="max-w-2xl" onSave={() => { /* TODO: 합 100 검증 후 createTarget */ }}>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="tw-date" class="block text-sm font-medium text-gray-700 mb-1">적용일</label>
        <input id="tw-date" type="date" bind:value={form.effectiveDate} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2" />
      </div>
      <div>
        <label for="tw-cash" class="block text-sm font-medium text-gray-700 mb-1">현금비중 (%)</label>
        <input id="tw-cash" type="number" step="0.0001" bind:value={form.cashWeight} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2" />
      </div>
    </div>
    <div>
      <label for="tw-memo" class="block text-sm font-medium text-gray-700 mb-1">메모</label>
      <input id="tw-memo" type="text" bind:value={form.memo} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2" />
    </div>
    <div>
      <div class="flex items-center justify-between mb-1">
        <span class="block text-sm font-medium text-gray-700">종목별 목표비율</span>
        <span class="text-xs text-gray-400">현금 + 종목 합계 = 100% 필요</span>
      </div>
      <div class="border border-gray-200 rounded-md p-3 text-sm text-gray-400 min-h-[120px] flex items-center justify-center">
        종목/비율 입력 그리드 (연동 예정)
      </div>
    </div>
  </Modal>
</StandardListPage>
