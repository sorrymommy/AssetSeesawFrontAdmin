<script>
  /**
   * 계좌투입현황 [구현]
   * 조회조건: 계좌(여러 개 선택, 비우면 전체) — 화면을 열면 전체 계좌를 바로 조회하고, 계좌를 바꾸면 [Search]로 다시 조회한다
   *   (계좌 목록은 조회 결과의 계좌로 채운다 — 거래 없는 계좌도 결과에 포함되므로 본인 계좌 전체)
   * - 계좌별 총 입금액(입금 거래 합), 총 출금액(출금 거래 합), 계좌투입금액(= 총 입금액 - 총 출금액)
   * - 평가금액(= 보유수량 × 최신 종가 + 현금잔고, 계좌잔고의 계좌 평가금액과 같은 값),
   *   수익률(%) = (평가금액 - 계좌투입금액) / 계좌투입금액 — 투입금액이 0 이하이면 '-'. + 는 붉은색, - 는 파란색
   * - 금액은 KRW 기준 (외화는 최신 환율 환산) — 계산은 API. 그리드 하단에 합계 행 (합계 수익률은 합계 금액으로 계산)
   * API: accountApi.funding
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import MultiSelectComboBox from '$lib/components/controls/MultiSelectComboBox.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { accountApi } from '$lib/api/accountApi';
  import { codes, codeName, CODE_GROUP } from '$lib/stores/codeStore';

  /** @param {any} v */
  const fmt = (v) => (v === null || v === undefined ? '-' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 0 }));
  const amountFormatter = (/** @type {any} */ { value }) => fmt(value);
  /** @param {any} v 합계 행 */
  const sumTemplate = (v) => `<div class="text-right font-semibold">${fmt(v.sum)}</div>`;

  /** 수익률(%) — 부호(+) 표시, + 는 붉은색, - 는 파란색 @param {any} v */
  const fmtRate = (v) => {
    if (v === null || v === undefined) return '-';
    const n = Number(v);
    const text = `${n > 0 ? '+' : ''}${n.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return n === 0 ? text : `<span class="${n > 0 ? 'text-red-600' : 'text-blue-600'}">${text}</span>`;
  };

  /** 합계 수익률 = (평가금액 합 - 투입금액 합) / 투입금액 합 */
  const totalRateTemplate = () => {
    const rows = grid?.getData() ?? [];
    const net = rows.reduce((/** @type {number} */ s, /** @type {any} */ r) => s + Number(r.netInvestedKrw ?? 0), 0);
    const value = rows.reduce((/** @type {number} */ s, /** @type {any} */ r) => s + Number(r.valueKrw ?? 0), 0);
    return `<div class="text-right font-semibold">${fmtRate(net > 0 ? ((value - net) / net) * 100 : null)}</div>`;
  };

  const columns = [
    { header: '계좌번호', name: 'accountNumber', width: 160, sortable: true },
    { header: '계좌명', name: 'name', minWidth: 160, sortable: true, formatter: (/** @type {any} */ { value, row }) => `${value}${row.isActive ? '' : ' <span class="text-gray-400">· 비활성</span>'}` },
    { header: '증권사', name: 'brokerName', width: 140, sortable: true },
    { header: '총 입금액', name: 'depositKrw', align: 'right', minWidth: 140, sortable: true, formatter: amountFormatter },
    { header: '총 출금액', name: 'withdrawKrw', align: 'right', minWidth: 140, sortable: true, formatter: amountFormatter },
    { header: '계좌투입금액', name: 'netInvestedKrw', align: 'right', minWidth: 150, sortable: true, formatter: amountFormatter },
    { header: '평가금액', name: 'valueKrw', align: 'right', minWidth: 150, sortable: true, formatter: amountFormatter },
    { header: '수익률(%)', name: 'returnRate', align: 'right', width: 110, sortable: true, formatter: (/** @type {any} */ { value }) => fmtRate(value) }
  ];

  const summary = {
    height: 36,
    position: 'bottom',
    columnContent: {
      accountNumber: { template: () => '<span class="font-semibold">합계</span>' },
      depositKrw: { template: sumTemplate },
      withdrawKrw: { template: sumTemplate },
      netInvestedKrw: { template: sumTemplate },
      valueKrw: { template: sumTemplate },
      returnRate: { template: totalRateTemplate }
    }
  };

  /** @type {any} */
  let grid;
  /** @type {Array<{value:any,label:string}>} */
  let accountOptions = $state([]);
  /** @type {string[]} 고른 계좌 ID (비우면 전체) */
  let accountIds = $state([]);

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  async function loadFunding() {
    try {
      const list = (await accountApi.funding()) ?? [];
      accountOptions = list.map((/** @type {any} */ a) => ({
        value: String(a.accountId),
        label: `${a.name}-${a.accountNumber}${a.isActive ? '' : ' · 비활성'}`
      }));
      // 고른 계좌가 그 사이 삭제됐으면 선택에서 뺀다
      accountIds = accountIds.filter((id) => accountOptions.some((o) => o.value === id));
      grid?.resetData(
        list
          .filter((/** @type {any} */ a) => accountIds.length === 0 || accountIds.includes(String(a.accountId)))
          .map((/** @type {any} */ a) => ({ ...a, brokerName: codeName($codes, CODE_GROUP.BROKER, a.broker) }))
      );
    } catch (error) {
      console.error('Failed to load funding:', error);
      alert(`계좌투입현황을 불러오지 못했습니다.\n${errorMessage(error)}`);
    }
  }

  /** @param {any} g */
  function handleReady(g) {
    grid = g;
    loadFunding();
  }

  const actions = [{ label: 'Search', color: BUTTON_COLORS.INDIGO, iconType: 'search', onClick: loadFunding }];
</script>

<StandardListPage title="계좌투입현황" {columns} {actions} {summary} rowHeaders={['rowNum']} onReady={handleReady}>
  {#snippet filters()}
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
      <MultiSelectComboBox id="af-account" label="계좌" class="sm:col-span-2" options={accountOptions} bind:value={accountIds} placeholder="전체" />
    </div>
  {/snippet}
</StandardListPage>
