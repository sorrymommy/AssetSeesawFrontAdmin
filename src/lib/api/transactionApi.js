import { apiClient } from './apiClient';

/**
 * 거래/현금흐름 API (account_transaction)
 * WebAPI: TransactionsController (api/transactions)
 * tx_type: BUY/SELL(매매) | DEPOSIT/WITHDRAW/DIVIDEND/INTEREST/FEE/EXCHANGE_IN/EXCHANGE_OUT/ADJUST(현금)
 * @typedef {string|number} Id
 */
export const transactionApi = {
  /** GET /api/transactions?accountId&txType&stockId&from&to @param {Record<string, any>} [params] */
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return apiClient.get(`/transactions${qs ? `?${qs}` : ''}`);
  },
  /** GET /api/transactions/{id} @param {Id} id */
  get: (id) => apiClient.get(`/transactions/${id}`),
  /** POST /api/transactions @param {object} body (매매: stockId/quantity/price, 현금: currency/amount) */
  create: (body) => apiClient.post('/transactions', body),
  /** PUT /api/transactions/{id} @param {Id} id @param {object} body */
  update: (id, body) => apiClient.put(`/transactions/${id}`, body),
  /** DELETE /api/transactions/{id} (soft) @param {Id} id */
  remove: (id) => apiClient.delete(`/transactions/${id}`),
  /** POST /api/transactions/{id}/restore @param {Id} id */
  restore: (id) => apiClient.post(`/transactions/${id}/restore`)
};

/**
 * 매매 거래 유형 — 종목·수량·단가를 쓰는 유형(그 외는 현금흐름: 통화·금액).
 * 백엔드 검증·DB CHECK와 같은 로직 구분이라 상수로 둔다. 표시명·순서는 공통 코드(TX_TYPE).
 */
export const TRADE_TX_TYPES = ['BUY', 'SELL'];
