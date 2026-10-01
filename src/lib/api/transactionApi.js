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

export const TX_TYPES = {
  TRADE: ['BUY', 'SELL'],
  CASH: ['DEPOSIT', 'WITHDRAW', 'DIVIDEND', 'INTEREST', 'FEE', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'ADJUST']
};

/** @type {Record<string, string>} 화면 표시용 거래 유형명 */
export const TX_TYPE_LABELS = {
  BUY: '매수',
  SELL: '매도',
  DEPOSIT: '입금',
  WITHDRAW: '출금',
  DIVIDEND: '배당',
  INTEREST: '이자',
  FEE: '수수료',
  EXCHANGE_IN: '환전입금',
  EXCHANGE_OUT: '환전출금',
  ADJUST: '조정'
};
