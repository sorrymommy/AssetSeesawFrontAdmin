<script>
  /**
   * 계좌 관리 [구현]
   * 목록 / 등록·수정 팝업
   * API: accountApi (/accounts CRUD)
   * 수정은 계좌명·활성만 가능 — 증권사·계좌번호는 등록 후 변경 불가
   */
  import { tick } from 'svelte';
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { accountApi } from '$lib/api/accountApi';

  const columns = [
    { header: '계좌명', name: 'name', sortable: true },
    { header: '증권사', name: 'broker', sortable: true },
    { header: '계좌번호', name: 'accountNumber', minWidth: 160 },
    { header: '활성', name: 'isActive', align: 'center', width: 80, formatter: (/** @type {any} */ { value }) => (value ? 'Y' : 'N') },
    { header: '생성일', name: 'createdAt', align: 'center', sortable: true, formatter: (/** @type {any} */ { value }) => (value ? String(value).slice(0, 10) : '') }
  ];

  /** @type {any} */
  let grid;
  let isOpen = $state(false);
  /** @type {number|null} 수정 대상 id (null = 신규) */
  let editingId = $state(null);
  let form = $state({ name: '', broker: '', accountNumber: '', isActive: true });

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  /** @param {any} g */
  function handleReady(g) {
    grid = g;
    loadAccounts();
  }

  async function loadAccounts() {
    try {
      const list = await accountApi.list();
      grid?.resetData(list ?? []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      alert(`계좌 목록을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  function openAdd() {
    editingId = null;
    form = { name: '', broker: '', accountNumber: '', isActive: true };
    isOpen = true;
  }
  /** @param {any} row */
  function openEdit(row) {
    editingId = row.accountId;
    form = { name: row.name ?? '', broker: row.broker ?? '', accountNumber: row.accountNumber ?? '', isActive: row.isActive ?? true };
    isOpen = true;
  }

  /** 검증 실패 시 Modal이 닫힌 뒤 다시 연다 @param {string} message */
  async function reject(message) {
    alert(message);
    await tick();
    isOpen = true;
  }

  async function save() {
    const name = form.name.trim();
    try {
      if (editingId === null) {
        const broker = form.broker.trim();
        const accountNumber = form.accountNumber.trim();
        if (!name || !broker || !accountNumber) return reject('계좌명·증권사·계좌번호를 입력하세요.');
        await accountApi.create({ name, broker, accountNumber });
      } else {
        if (!name) return reject('계좌명을 입력하세요.');
        await accountApi.update(editingId, { name, isActive: form.isActive });
      }
      await loadAccounts();
    } catch (error) {
      console.error('Failed to save account:', error);
      alert(`저장에 실패했습니다.\n${errorMessage(error)}`);
      isOpen = true; // 입력값을 유지한 채 팝업을 다시 연다
    }
  }

  async function removeChecked() {
    const rows = grid?.getCheckedRows() ?? [];
    if (rows.length === 0) {
      alert('삭제할 계좌를 선택하세요.');
      return;
    }
    if (!confirm(`선택한 ${rows.length}건을 삭제할까요?\n포트폴리오에 연결된 계좌는 먼저 연결을 해제해야 합니다.`)) return;
    /** @type {string[]} */
    const failures = [];
    for (const row of rows) {
      try {
        await accountApi.remove(row.accountId);
      } catch (error) {
        failures.push(`${row.name}: ${errorMessage(error)}`);
      }
    }
    if (failures.length > 0) alert(`일부 계좌를 삭제하지 못했습니다.\n${failures.join('\n')}`);
    await loadAccounts();
  }

  const actions = [
    { label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: loadAccounts },
    { label: 'Add', color: BUTTON_COLORS.EMERALD, iconType: 'add', onClick: openAdd },
    { label: 'Remove', color: BUTTON_COLORS.ROSE, iconType: 'remove', onClick: removeChecked }
  ];

  const inputClass = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500';
</script>

<StandardListPage title="계좌 관리" {columns} {actions} onReady={handleReady} onRowDblClick={openEdit}>
  <Modal bind:isOpen title={editingId === null ? '계좌 등록' : '계좌 수정'} onSave={save}>
    <div>
      <label for="ac-name" class="block text-sm font-medium text-gray-700 mb-1">계좌명</label>
      <input id="ac-name" type="text" maxlength="50" bind:value={form.name} placeholder="예: 키움 연금" class={inputClass} />
    </div>
    <div>
      <label for="ac-broker" class="block text-sm font-medium text-gray-700 mb-1">증권사</label>
      <input id="ac-broker" type="text" maxlength="50" bind:value={form.broker} disabled={editingId !== null} class={inputClass} />
    </div>
    <div>
      <label for="ac-no" class="block text-sm font-medium text-gray-700 mb-1">계좌번호</label>
      <input id="ac-no" type="text" maxlength="50" bind:value={form.accountNumber} disabled={editingId !== null} class={inputClass} />
    </div>
    {#if editingId !== null}
      <label class="inline-flex items-center gap-2 cursor-pointer">
        <input type="checkbox" bind:checked={form.isActive} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
        <span class="text-sm text-gray-700">활성 (해제 시 운용 중지)</span>
      </label>
      <p class="text-xs text-gray-400">증권사·계좌번호는 등록 후 변경할 수 없습니다.</p>
    {/if}
  </Modal>
</StandardListPage>
