<script>
  /** 보유 포지션 현황 [구현] — /portfolios/{id}/positions (v_position) */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';

  const columns = [
    { header: '포트폴리오', name: 'portfolio', sortable: true },
    { header: '계좌', name: 'account', sortable: true },
    { header: '티커', name: 'ticker', sortable: true },
    { header: '통화', name: 'currency', align: 'center', width: 70 },
    { header: '수량', name: 'quantity', align: 'right', sortable: true },
    { header: '평단', name: 'avgBuyPrice', align: 'right' },
    { header: '평가액(KRW)', name: 'valueKrw', align: 'right', sortable: true, minWidth: 140 }
  ];

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: () => {} },
    { label: 'Export', color: BUTTON_COLORS.TEAL, iconType: 'export', onClick: () => {} }
  ];
</script>

<StandardListPage title="보유 포지션 현황" {columns} data={[]} {actions} />
