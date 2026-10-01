import { apiClient } from './apiClient';

/**
 * 포트폴리오 / 목표비율 / 평가 API
 * WebAPI: PortfoliosController (api/portfolios)
 * NOTE: 현재는 시그니처 스텁. 실제 화면 연동 시 mock 제거하고 apiClient 호출 활성화.
 * @typedef {string|number} Id
 */
export const portfolioApi = {
  // GET /api/portfolios
  list: () => apiClient.get('/portfolios'),
  /** GET /api/portfolios/{id} @param {Id} id */
  get: (id) => apiClient.get(`/portfolios/${id}`),
  /** POST /api/portfolios @param {object} body {name, description, accountIds?} */
  create: (body) => apiClient.post('/portfolios', body),
  /** PUT /api/portfolios/{id} @param {Id} id @param {object} body {name, description, isActive, accountIds?} */
  update: (id, body) => apiClient.put(`/portfolios/${id}`, body),
  /** DELETE /api/portfolios/{id} (soft) @param {Id} id */
  remove: (id) => apiClient.delete(`/portfolios/${id}`),
  /** POST /api/portfolios/{id}/restore @param {Id} id */
  restore: (id) => apiClient.post(`/portfolios/${id}/restore`),

  // ----- 계좌 연결 (portfolio_account) -----
  /** GET /api/portfolios/{id}/accounts (연결 이력) @param {Id} id */
  accounts: (id) => apiClient.get(`/portfolios/${id}/accounts`),
  // 계좌 연결 동기화는 update()의 accountIds 로 처리

  // ----- 목표비율 (portfolio_target_version/item) -----
  /** GET /api/portfolios/{id}/targets @param {Id} id */
  targets: (id) => apiClient.get(`/portfolios/${id}/targets`),
  /** POST /api/portfolios/{id}/targets @param {Id} id @param {object} body {effectiveDate, cashWeight, memo, items[]} */
  createTarget: (id, body) => apiClient.post(`/portfolios/${id}/targets`, body),
  /** DELETE /api/portfolios/{id}/targets/{versionId} @param {Id} id @param {Id} versionId */
  removeTarget: (id, versionId) => apiClient.delete(`/portfolios/${id}/targets/${versionId}`),
  /** POST .../targets/{versionId}/restore @param {Id} id @param {Id} versionId */
  restoreTarget: (id, versionId) => apiClient.post(`/portfolios/${id}/targets/${versionId}/restore`),

  // ----- 평가/현황 (views) -----
  /** GET /api/portfolios/{id}/valuation (현재 vs 목표 비중, KRW) @param {Id} id */
  valuation: (id) => apiClient.get(`/portfolios/${id}/valuation`),
  /** GET /api/portfolios/{id}/positions (v_position) @param {Id} id */
  positions: (id) => apiClient.get(`/portfolios/${id}/positions`),
  /** GET /api/portfolios/{id}/cash-balances (v_cash_balance) @param {Id} id */
  cashBalances: (id) => apiClient.get(`/portfolios/${id}/cash-balances`)
};
