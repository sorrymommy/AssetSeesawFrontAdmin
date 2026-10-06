<script>
  /**
   * 계좌투입현황 [구현]
   * 조회조건 없음 — 화면을 열면 바로 본인 계좌 전체를 조회한다 ([Search]로 다시 조회)
   * - 계좌별 총 입금액(입금 거래 합), 총 출금액(출금 거래 합), 계좌투입금액(= 총 입금액 - 총 출금액)
   * - 금액은 KRW 기준 (외화는 최신 환율 환산) — 계산은 API. 그리드 하단에 합계 행
   * API: accountApi.funding
   */
  import StandardListPage from '$lib/components/common/StandardListPage.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { accountApi } from '$lib/api/accountApi';
  import { codes, codeName, CODE_GROUP } from '$lib/stores/codeStore';

  /** @param {any} v */
  const fmt = (v) => (v === null || v === undefined ? '-' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 0 }));
  const amountFormatter = (/** @type {any} */ { value }) => fmt(value);
  /** @param {any} v 합계 행 */
  const sumTemplate = (v) => `<div class="text-right font-semibold">${fmt(v.sum)}</div>`;

  const columns = [
    { header: '계좌번호', name: 'accountNumber', width: 160, sortable: true },
    { header: '계좌명', name: 'name', minWidth: 160, sortable: true, formatter: (/** @type {any} */ { value, row }) => `${value}${row.isActive ? '' : ' <span class="text-gray-400">· 비활성</span>'}` },
    { header: '증권사', name: 'brokerName', width: 140, sortable: true },
    { header: '총 입금액', name: 'depositKrw', align: 'right', minWidth: 140, sortable: true, formatter: amountFormatter },
    { header: '총 출금액', name: 'withdrawKrw', align: 'right', minWidth: 140, sortable: true, formatter: amountFormatter },
    { header: '계좌투입금액', name: 'netInvestedKrw', align: 'right', minWidth: 150, sortable: true, formatter: amountFormatter }
  ];

  const summary = {
    height: 36,
    position: 'bottom',
    columnContent: {
      accountNumber: { template: () => '<span class="font-semibold">합계</span>' },
      depositKrw: { template: sumTemplate },
      withdrawKrw: { template: sumTemplate },
      netInvestedKrw: { template: sumTemplate }
    }
  };

  /** @type {any} */
  let grid;

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  async function loadFunding() {
    try {
      const list = await accountApi.funding();
      grid?.resetData(
        (list ?? []).map((/** @type {any} */ a) => ({ ...a, brokerName: codeName($codes, CODE_GROUP.BROKER, a.broker) }))
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

<StandardListPage title="계좌투입현황" {columns} {actions} {summary} onReady={handleReady} />
