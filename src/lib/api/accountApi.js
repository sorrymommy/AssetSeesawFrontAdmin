import { apiClient } from './apiClient';

/**
 * 계좌 API
 * WebAPI: AccountsController (api/accounts)
 * @typedef {string|number} Id
 */
export const accountApi = {
  // GET /api/accounts
  list: () => apiClient.get('/accounts'),
  /** GET /api/accounts/{id} @param {Id} id */
  get: (id) => apiClient.get(`/accounts/${id}`),
  /** POST /api/accounts @param {object} body {name, broker, accountNumber} */
  create: (body) => apiClient.post('/accounts', body),
  /** PUT /api/accounts/{id} @param {Id} id @param {object} body {name, isActive} */
  update: (id, body) => apiClient.put(`/accounts/${id}`, body),
  /** DELETE /api/accounts/{id} (soft) @param {Id} id */
  remove: (id) => apiClient.delete(`/accounts/${id}`),
  /** POST /api/accounts/{id}/restore @param {Id} id */
  restore: (id) => apiClient.post(`/accounts/${id}/restore`),

  // 잔고/포지션 (현재 별도 화면 없음, 대시보드 보유현황에서 포트폴리오 단위로 조회)
  /** GET /api/accounts/{id}/cash-balance @param {Id} id */
  cashBalance: (id) => apiClient.get(`/accounts/${id}/cash-balance`),
  /** GET /api/accounts/{id}/positions @param {Id} id */
  positions: (id) => apiClient.get(`/accounts/${id}/positions`)
};
