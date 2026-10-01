<script>
  /**
   * 거래 내역 [구현]
   * 목록(계좌/유형/종목/기간 필터) / 등록·수정 팝업 (tx_type별 폼 분기)
   * API: transactionApi (/transactions)
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { TX_TYPES } from '$lib/api/transactionApi';

  const columns = [
    { header: '거래일', name: 'txDate', align: 'center', sortable: true },
    { header: '계좌', name: 'account', sortable: true },
    { header: '유형', name: 'txType', align: 'center', width: 110 },
    { header: '종목', name: 'ticker', width: 100 },
    { header: '수량', name: 'quantity', align: 'right' },
    { header: '단가', name: 'price', align: 'right' },
    { header: '금액', name: 'amount', align: 'right' },
    { header: '수수료', name: 'fee', align: 'right', width: 90 },
    { header: '세금', name: 'tax', align: 'right', width: 90 }
  ];

  const allTxTypes = [...TX_TYPES.TRADE, ...TX_TYPES.CASH].map((t) => ({ value: t, label: t }));

  let filterType = $state('');
  let isOpen = $state(false);
  let form = $state({ txType: 'BUY', txDate: '', stockId: '', quantity: '', price: '', currency: 'KRW', amount: '', fee: 0, tax: 0, note: '' });

  const isTrade = $derived(TX_TYPES.TRADE.includes(form.txType));

  function openAdd() {
    form = { txType: 'BUY', txDate: '', stockId: '', quantity: '', price: '', currency: 'KRW', amount: '', fee: 0, tax: 0, note: '' };
    isOpen = true;
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: () => {} },
    { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
    { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: () => {} }
  ];
</script>

<StandardListPage title="거래 내역" {columns} data={[]} {actions} onRowDblClick={() => (isOpen = true)}>
  {#snippet filters()}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <LookupComboBox id="tx-type" label="거래 유형" options={allTxTypes} bind:value={filterType} placeholder="전체" />
      <div>
        <label for="tx-from" class="block text-xs font-medium text-gray-700 mb-1">시작일</label>
        <input id="tx-from" type="date" class="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border" />
      </div>
      <div>
        <label for="tx-to" class="block text-xs font-medium text-gray-700 mb-1">종료일</label>
        <input id="tx-to" type="date" class="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border" />
      </div>
      <div>
        <label for="tx-ticker" class="block text-xs font-medium text-gray-700 mb-1">종목</label>
        <input id="tx-ticker" type="text" placeholder="티커" class="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border" />
      </div>
    </div>
  {/snippet}

  <Modal bind:isOpen title="거래 등록/수정" width="max-w-lg" onSave={() => { /* TODO: transactionApi.create/update */ }}>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="f-type" class="block text-sm font-medium text-gray-700 mb-1">거래 유형</label>
        <select id="f-type" bind:value={form.txType} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2">
          <optgroup label="매매">
            {#each TX_TYPES.TRADE as t}<option value={t}>{t}</option>{/each}
          </optgroup>
          <optgroup label="현금흐름">
            {#each TX_TYPES.CASH as t}<option value={t}>{t}</option>{/each}
          </optgroup>
        </select>
      </div>
      <div>
        <label for="f-date" class="block text-sm font-medium text-gray-700 mb-1">거래일</label>
        <input id="f-date" type="date" bind:value={form.txDate} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2" />
      </div>
    </div>

    {#if isTrade}
      <!-- 매매: 종목/수량/단가 -->
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label for="f-stock" class="block text-sm font-medium text-gray-700 mb-1">종목</label>
          <input id="f-stock" type="text" bind:value={form.stockId} placeholder="종목 선택" class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
        </div>
        <div>
          <label for="f-qty" class="block text-sm font-medium text-gray-700 mb-1">수량</label>
          <input id="f-qty" type="number" bind:value={form.quantity} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
        </div>
        <div>
          <label for="f-price" class="block text-sm font-medium text-gray-700 mb-1">단가</label>
          <input id="f-price" type="number" bind:value={form.price} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
        </div>
      </div>
    {:else}
      <!-- 현금: 통화/금액 -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="f-cur" class="block text-sm font-medium text-gray-700 mb-1">통화</label>
          <input id="f-cur" type="text" bind:value={form.currency} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
        </div>
        <div>
          <label for="f-amt" class="block text-sm font-medium text-gray-700 mb-1">금액</label>
          <input id="f-amt" type="number" bind:value={form.amount} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
        </div>
      </div>
    {/if}

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="f-fee" class="block text-sm font-medium text-gray-700 mb-1">수수료</label>
        <input id="f-fee" type="number" bind:value={form.fee} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
      </div>
      <div>
        <label for="f-tax" class="block text-sm font-medium text-gray-700 mb-1">세금</label>
        <input id="f-tax" type="number" bind:value={form.tax} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
      </div>
    </div>
    <div>
      <label for="f-note" class="block text-sm font-medium text-gray-700 mb-1">비고</label>
      <input id="f-note" type="text" bind:value={form.note} class="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border px-3 py-2" />
    </div>
  </Modal>
</StandardListPage>
