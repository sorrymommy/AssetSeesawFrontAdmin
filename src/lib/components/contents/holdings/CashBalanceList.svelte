<script>
  /** 현금 잔고 현황 [구현] — /portfolios/{id}/cash-balances (v_cash_balance) */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';

  const columns = [
    { header: '포트폴리오', name: 'portfolio', sortable: true },
    { header: '계좌', name: 'account', sortable: true },
    { header: '통화', name: 'currency', align: 'center', width: 80 },
    { header: '잔고', name: 'balance', align: 'right', sortable: true, minWidth: 140 },
    { header: '잔고(KRW 환산)', name: 'balanceKrw', align: 'right', minWidth: 160 }
  ];

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: () => {} },
    { label: 'Export', color: BUTTON_COLORS.TEAL, iconType: 'export', onClick: () => {} }
  ];
</script>

<StandardListPage title="현금 잔고 현황" {columns} data={[]} {actions} />
