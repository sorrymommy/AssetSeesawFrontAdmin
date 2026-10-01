<script>
  /**
   * 리밸런싱 실행 이력 [구현]
   * run 목록 / 상세(주문 목록) / [상태변경][체결연결] 버튼
   * API: rebalancingApi (runs, getRun, updateRunStatus, linkOrderTransaction)
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';

  const columns = [
    { header: 'Run ID', name: 'runId', align: 'center', width: 90 },
    { header: '포트폴리오', name: 'portfolio', sortable: true },
    { header: '기준일', name: 'runDate', align: 'center', sortable: true },
    { header: '총평가액(KRW)', name: 'totalValueKrw', align: 'right', minWidth: 150 },
    { header: '상태', name: 'status', align: 'center', width: 110 },
    { header: '메모', name: 'memo', minWidth: 180 }
  ];

  let isDetailOpen = $state(false);

  function openDetail() { isDetailOpen = true; }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: () => {} },
    { label: '상세/주문', color: BUTTON_COLORS.BLUE, onClick: openDetail },
    { label: '상태변경', color: BUTTON_COLORS.SLATE, onClick: () => { /* TODO: updateRunStatus */ } }
  ];
</script>

<StandardListPage title="리밸런싱 실행 이력" {columns} data={[]} {actions} onRowDblClick={openDetail}>
  <Modal bind:isOpen={isDetailOpen} title="리밸런싱 주문 상세" width="max-w-3xl">
    <p class="text-sm text-gray-500">선택한 run의 주문 제안 목록입니다. 각 주문에 실제 체결 거래를 연결할 수 있습니다.</p>
    <div class="border border-gray-200 rounded-md p-3 text-sm text-gray-400 min-h-[160px] flex items-center justify-center">
      주문 제안 목록 (종목/계좌/현재·목표비중/액션/제안수량/체결연결) — 연동 예정
    </div>
  </Modal>
</StandardListPage>
