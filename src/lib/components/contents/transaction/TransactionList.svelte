<script>
  /**
   * 거래 내역 [구현]
   * 목록(계좌/유형/종목/기간 필터) / 등록·수정 팝업 (tx_type별 폼 분기) / 소프트삭제
   * API: transactionApi (/transactions), accountApi.list, stockApi.list
   * 거래 유형·통화·증권사 표시명과 선택 목록은 공통 코드(codeStore)
   * 매매(BUY/SELL): 종목·수량·단가 필수, 통화는 종목 통화 / 현금흐름: 통화·금액 필수(배당은 종목 선택 가능)
   */
  import { tick } from 'svelte';
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { transactionApi, TRADE_TX_TYPES } from '$lib/api/transactionApi';
  import { codes, loadCodes, codeName, codeOptions, CODE_GROUP } from '$lib/stores/codeStore';
  import { accountApi } from '$lib/api/accountApi';
  import { stockApi } from '$lib/api/stockApi';

  /** @param {any} v 숫자 표시 (빈 값은 공백) */
  const num = (v) => (v === null || v === undefined || v === '' ? '' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 6 }));
  const numFormatter = (/** @type {any} */ { value }) => num(value);

  const columns = [
    { header: '거래일', name: 'txDate', align: 'center', width: 110, sortable: true },
    { header: '계좌', name: 'accountName', minWidth: 140, sortable: true },
    { header: '유형', name: 'txTypeLabel', align: 'center', width: 90 },
    { header: '종목', name: 'stockName', minWidth: 140 },
    { header: '수량', name: 'quantity', align: 'right', width: 100, formatter: numFormatter },
    { header: '단가', name: 'price', align: 'right', width: 110, formatter: numFormatter },
    { header: '금액', name: 'displayAmount', align: 'right', width: 130, formatter: numFormatter },
    { header: '통화', name: 'currency', align: 'center', width: 70 },
    { header: '수수료', name: 'fee', align: 'right', width: 90, formatter: numFormatter },
    { header: '세금', name: 'tax', align: 'right', width: 90, formatter: numFormatter },
    { header: '비고', name: 'note', minWidth: 160 }
  ];

  // 거래 유형은 시스템 코드 — 매매(BUY/SELL) 여부는 로직이라 TRADE_TX_TYPES로 구분하고, 표시명·순서는 공통 코드
  const txTypeOptions = $derived(codeOptions($codes, CODE_GROUP.TX_TYPE, { includeInactive: true }));
  const tradeTypeOptions = $derived(txTypeOptions.filter((o) => TRADE_TX_TYPES.includes(o.value)));
  const cashTypeOptions = $derived(txTypeOptions.filter((o) => !TRADE_TX_TYPES.includes(o.value)));

  /** @type {any} */
  let grid;
  /** @type {any[]} */
  let accounts = $state([]);
  /** @type {any[]} 전체 종목 (상장폐지 포함 — 과거 거래 종목명 표시용) */
  let stocks = $state([]);
  /** @type {Map<number, any>} */
  let stockById = $derived(new Map(stocks.map((s) => [s.stockId, s])));
  /** @type {Map<string, any>} datalist 표시 문자열 → 종목 (활성 종목만 선택 가능) */
  let stockByLabel = $derived(new Map(stocks.filter((s) => s.isActive).map((s) => [stockLabel(s), s])));
  const accountOptions = $derived(accounts.map((a) => ({ value: String(a.accountId), label: `${a.name}-${a.accountNumber}${a.isActive ? '' : ' · 비활성'}` })));

  let filter = $state({ accountId: '', txType: '', stock: '', from: '', to: '' });

  let isOpen = $state(false);
  /** @type {number|null} 수정 대상 id (null = 신규) */
  let editingId = $state(null);
  let form = $state(emptyForm());
  const isTrade = $derived(TRADE_TX_TYPES.includes(form.txType));
  const currencyOptions = $derived(codeOptions($codes, CODE_GROUP.CURRENCY, { keep: form.currency }));
  const tradeAmount = $derived(isTrade && form.quantity !== '' && form.price !== '' ? Number(form.quantity) * Number(form.price) : null);

  /** @param {any} s */
  function stockLabel(s) {
    return `${s.ticker} ${s.name}`;
  }

  /**
   * 입력값 → 활성 종목. 목록에서 고른 "티커 종목명" 외에 티커·종목명을 정확히 입력한 경우도 받는다.
   * @param {string} query
   */
  function resolveStock(query) {
    const q = query.trim();
    if (!q) return undefined;
    const byLabel = stockByLabel.get(q);
    if (byLabel) return byLabel;
    const matches = stocks.filter((s) => s.isActive && (s.ticker === q || s.name === q));
    return matches.length === 1 ? matches[0] : undefined;
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function emptyForm() {
    return { accountId: '', txType: 'BUY', txDate: today(), stock: '', quantity: '', price: '', currency: defaultCurrency(), amount: '', fee: '0', tax: '0', note: '' };
  }

  /** 기본 통화 = 통화 코드 중 정렬순서가 가장 앞선 사용 중 코드 */
  function defaultCurrency() {
    return codeOptions($codes, CODE_GROUP.CURRENCY)[0]?.value ?? '';
  }

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  /** @param {any} g */
  async function handleReady(g) {
    grid = g;
    try {
      const [accountList, stockList] = await Promise.all([accountApi.list(), stockApi.list(), loadCodes()]);
      accounts = accountList ?? [];
      stocks = stockList ?? [];
    } catch (error) {
      console.error('Failed to load master data:', error);
      alert(`계좌·종목 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
      return;
    }
    await loadTransactions();
  }

  async function loadTransactions() {
    let stockId;
    if (filter.stock.trim()) {
      const q = filter.stock.trim();
      const stock = resolveStock(q) ?? stocks.find((s) => s.ticker === q);
      if (!stock) {
        alert('종목을 찾을 수 없습니다. 목록에서 선택하거나 티커를 정확히 입력하세요.');
        return;
      }
      stockId = stock.stockId;
    }
    try {
      const list =
        (await transactionApi.list({ accountId: filter.accountId, txType: filter.txType, stockId, from: filter.from, to: filter.to })) ?? [];
      const accountName = new Map(accounts.map((a) => [a.accountId, a.name]));
      grid?.resetData(
        list.map((/** @type {any} */ t) => ({
          ...t,
          accountName: accountName.get(t.accountId) ?? t.accountId,
          txTypeLabel: codeName($codes, CODE_GROUP.TX_TYPE, t.txType),
          stockName: t.stockId ? (stockById.get(t.stockId)?.name ?? t.stockId) : '',
          // 매매는 수량×단가, 현금흐름은 금액
          displayAmount: t.amount ?? (t.quantity != null && t.price != null ? Number(t.quantity) * Number(t.price) : null)
        }))
      );
    } catch (error) {
      console.error('Failed to load transactions:', error);
      alert(`거래 내역을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  function openAdd() {
    if (accounts.length === 0) {
      alert('등록된 계좌가 없습니다. 거래·계좌 → 계좌 관리에서 먼저 등록하세요.');
      return;
    }
    editingId = null;
    form = { ...emptyForm(), accountId: filter.accountId || String(accounts[0].accountId) };
    isOpen = true;
  }

  /** @param {any} row */
  function openEdit(row) {
    const stock = row.stockId ? stockById.get(row.stockId) : null;
    const str = (/** @type {any} */ v) => (v === null || v === undefined ? '' : String(Number(v)));
    editingId = row.txId;
    form = {
      accountId: String(row.accountId),
      txType: row.txType,
      txDate: row.txDate,
      stock: stock ? stockLabel(stock) : '',
      quantity: str(row.quantity),
      price: str(row.price),
      currency: row.currency ?? defaultCurrency(),
      amount: str(row.amount),
      fee: str(row.fee),
      tax: str(row.tax),
      note: row.note ?? ''
    };
    isOpen = true;
  }

  /** 검증 실패 시 Modal이 닫힌 뒤 다시 연다 @param {string} message */
  async function reject(message) {
    alert(message);
    await tick();
    isOpen = true;
  }

  /** @param {any} v */
  const isBlank = (v) => v === '' || v === null || v === undefined;

  async function save() {
    if (!form.accountId) return reject('계좌를 선택하세요.');
    if (!form.txDate) return reject('거래일을 입력하세요.');
    const fee = isBlank(form.fee) ? 0 : Number(form.fee);
    const tax = isBlank(form.tax) ? 0 : Number(form.tax);
    if (!(fee >= 0) || !(tax >= 0)) return reject('수수료·세금은 0 이상이어야 합니다.');

    /** @type {Record<string, any>} */
    const body = { txDate: form.txDate, txType: form.txType, fee, tax, note: form.note.trim() || null };

    if (isTrade) {
      const stock = resolveStock(form.stock);
      if (!stock) return reject('종목을 목록에서 선택하세요.');
      const quantity = Number(form.quantity);
      const price = Number(form.price);
      if (isBlank(form.quantity) || !(quantity > 0)) return reject('수량은 0보다 커야 합니다.');
      if (isBlank(form.price) || !(price >= 0)) return reject('단가는 0 이상이어야 합니다.');
      Object.assign(body, { stockId: stock.stockId, quantity, price });
    } else {
      const currency = form.currency;
      const amount = Number(form.amount);
      if (!currency) return reject('통화를 선택하세요.');
      if (isBlank(form.amount) || !(amount > 0)) return reject('금액은 0보다 커야 합니다.');
      let stockId = null;
      if (form.stock.trim()) {
        const stock = resolveStock(form.stock);
        if (!stock) return reject('관련 종목을 목록에서 선택하거나 비워 두세요.');
        stockId = stock.stockId;
      }
      Object.assign(body, { currency, amount, stockId });
    }

    try {
      if (editingId === null) {
        await transactionApi.create({ ...body, accountId: Number(form.accountId) });
      } else {
        await transactionApi.update(editingId, body); // 계좌는 변경 불가 (수정 API가 받지 않음)
      }
      await loadTransactions();
    } catch (error) {
      console.error('Failed to save transaction:', error);
      alert(`저장에 실패했습니다.\n${errorMessage(error)}`);
      isOpen = true; // 입력값을 유지한 채 팝업을 다시 연다
    }
  }

  async function removeChecked() {
    const rows = grid?.getCheckedRows() ?? [];
    if (rows.length === 0) {
      alert('삭제할 거래를 선택하세요.');
      return;
    }
    if (!confirm(`선택한 ${rows.length}건을 삭제할까요?\n삭제한 거래는 보유 수량·현금잔고 계산에서 빠집니다.`)) return;
    try {
      for (const row of rows) {
        await transactionApi.remove(row.txId);
      }
    } catch (error) {
      console.error('Failed to remove transaction:', error);
      alert(`삭제에 실패했습니다.\n${errorMessage(error)}`);
    }
    await loadTransactions();
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: loadTransactions },
    { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
    { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: removeChecked }
  ];

  const filterInputClass = 'block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border';
  const inputClass = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
</script>

<StandardListPage title="거래 내역" {columns} {actions} onReady={handleReady} onRowDblClick={openEdit}>
  {#snippet filters()}
    <form class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4" onsubmit={(e) => { e.preventDefault(); loadTransactions(); }}>
      <LookupComboBox id="tx-account" label="계좌" options={accountOptions} bind:value={filter.accountId} placeholder="전체" />
      <LookupComboBox id="tx-type" label="거래 유형" options={txTypeOptions} bind:value={filter.txType} placeholder="전체" />
      <div>
        <label for="tx-stock" class="block text-xs font-medium text-gray-700 mb-1">종목</label>
        <input id="tx-stock" type="text" list="tx-stock-list" bind:value={filter.stock} placeholder="티커 또는 종목명" class={filterInputClass} />
      </div>
      <div>
        <label for="tx-from" class="block text-xs font-medium text-gray-700 mb-1">시작일</label>
        <input id="tx-from" type="date" bind:value={filter.from} class={filterInputClass} />
      </div>
      <div>
        <label for="tx-to" class="block text-xs font-medium text-gray-700 mb-1">종료일</label>
        <input id="tx-to" type="date" bind:value={filter.to} class={filterInputClass} />
      </div>
      <button type="submit" class="hidden" aria-hidden="true" tabindex="-1"></button>
    </form>
  {/snippet}

  <datalist id="tx-stock-list">
    {#each stocks as s (s.stockId)}
      {#if s.isActive}<option value={stockLabel(s)}></option>{/if}
    {/each}
  </datalist>

  <Modal bind:isOpen title={editingId === null ? '거래 등록' : '거래 수정'} width="max-w-lg" onSave={save}>
    <div>
      <label for="f-account" class={labelClass}>계좌</label>
      <select id="f-account" bind:value={form.accountId} disabled={editingId !== null} class={inputClass}>
        {#each accounts as a (a.accountId)}
          <option value={String(a.accountId)}>{a.name} ({codeName($codes, CODE_GROUP.BROKER, a.broker)} {a.accountNumber}){a.isActive ? '' : ' · 비활성'}</option>
        {/each}
      </select>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="f-type" class={labelClass}>거래 유형</label>
        <select id="f-type" bind:value={form.txType} class={inputClass}>
          <optgroup label="매매">
            {#each tradeTypeOptions as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
          </optgroup>
          <optgroup label="현금흐름">
            {#each cashTypeOptions as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
          </optgroup>
        </select>
      </div>
      <div>
        <label for="f-date" class={labelClass}>거래일</label>
        <input id="f-date" type="date" bind:value={form.txDate} class={inputClass} />
      </div>
    </div>

    {#if isTrade}
      <!-- 매매: 종목/수량/단가 -->
      <div>
        <label for="f-stock" class={labelClass}>종목</label>
        <input id="f-stock" type="text" list="tx-stock-list" bind:value={form.stock} placeholder="티커 또는 종목명 입력 후 선택" class={inputClass} />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="f-qty" class={labelClass}>수량</label>
          <input id="f-qty" type="number" min="0" step="any" bind:value={form.quantity} class="{inputClass} text-right" />
        </div>
        <div>
          <label for="f-price" class={labelClass}>단가</label>
          <input id="f-price" type="number" min="0" step="any" bind:value={form.price} class="{inputClass} text-right" />
        </div>
      </div>
      <p class="text-right text-sm text-gray-600">거래금액 <span class="font-semibold">{tradeAmount === null ? '-' : num(tradeAmount)}</span> <span class="text-xs text-gray-400">(통화는 종목 통화)</span></p>
    {:else}
      <!-- 현금흐름: 통화/금액 (+ 배당 등 관련 종목 선택) -->
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label for="f-cur" class={labelClass}>통화</label>
          <select id="f-cur" bind:value={form.currency} class={inputClass}>
            {#each currencyOptions as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
          </select>
        </div>
        <div class="col-span-2">
          <label for="f-amt" class={labelClass}>금액</label>
          <input id="f-amt" type="number" min="0" step="any" bind:value={form.amount} class="{inputClass} text-right" />
        </div>
      </div>
      <div>
        <label for="f-stock-opt" class={labelClass}>관련 종목 <span class="text-xs text-gray-400">(선택 — 배당 출처 등)</span></label>
        <input id="f-stock-opt" type="text" list="tx-stock-list" bind:value={form.stock} placeholder="없으면 비워 두세요" class={inputClass} />
      </div>
    {/if}

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="f-fee" class={labelClass}>수수료</label>
        <input id="f-fee" type="number" min="0" step="any" bind:value={form.fee} class="{inputClass} text-right" />
      </div>
      <div>
        <label for="f-tax" class={labelClass}>세금 <span class="text-xs text-gray-400">(거래세·원천징수)</span></label>
        <input id="f-tax" type="number" min="0" step="any" bind:value={form.tax} class="{inputClass} text-right" />
      </div>
    </div>
    <div>
      <label for="f-note" class={labelClass}>비고</label>
      <input id="f-note" type="text" bind:value={form.note} class={inputClass} />
    </div>
    {#if editingId !== null}
      <p class="text-xs text-gray-400">계좌는 등록 후 변경할 수 없습니다. 다른 계좌의 거래라면 삭제 후 다시 등록하세요.</p>
    {/if}
  </Modal>
</StandardListPage>
