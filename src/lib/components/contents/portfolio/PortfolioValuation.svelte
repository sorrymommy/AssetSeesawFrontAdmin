<script>
  /**
   * 포트폴리오 평가 [구현]
   * 현재 vs 목표 비중 목록 / [리밸런싱 제안 생성] 버튼 → run 생성
   * API: portfolioApi.valuation / rebalancingApi.createRun
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';

  const columns = [
    { header: '티커', name: 'ticker', sortable: true },
    { header: '평가액(KRW)', name: 'valueKrw', align: 'right', sortable: true, minWidth: 140 },
    { header: '현재비중(%)', name: 'currentWeight', align: 'right', width: 120 },
    { header: '목표비중(%)', name: 'targetWeight', align: 'right', width: 120 },
    { header: '괴리(%)', name: 'diff', align: 'right', width: 100 }
  ];

  let isRunOpen = $state(false);
  let runForm = $state({ runDate: '', bandThreshold: 5, memo: '' });

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: () => {} },
    { label: '리밸런싱 제안 생성', color: BUTTON_COLORS.AMBER, onClick: () => (isRunOpen = true) }
  ];
</script>

<StandardListPage title="포트폴리오 평가" {columns} data={[]} {actions}>
  <Modal bind:isOpen={isRunOpen} title="리밸런싱 제안 생성" onSave={() => { /* TODO: rebalancingApi.createRun */ }} saveLabel="생성">
    <p class="text-sm text-gray-500">현재 비중과 목표 비중의 괴리로 매수/매도 주문 제안을 생성합니다.</p>
    <div>
      <label for="rb-date" class="block text-sm font-medium text-gray-700 mb-1">기준일</label>
      <input id="rb-date" type="date" bind:value={runForm.runDate} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2" />
    </div>
    <div>
      <label for="rb-band" class="block text-sm font-medium text-gray-700 mb-1">밴드 임계치 (%) — 이내면 HOLD</label>
      <input id="rb-band" type="number" step="0.1" bind:value={runForm.bandThreshold} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2" />
    </div>
    <div>
      <label for="rb-memo" class="block text-sm font-medium text-gray-700 mb-1">메모</label>
      <input id="rb-memo" type="text" bind:value={runForm.memo} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2" />
    </div>
  </Modal>
</StandardListPage>
