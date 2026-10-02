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

  // ----- 목표비율 구분 (portfolio_category) — '현금'은 포트폴리오 생성 시 자동, 삭제 불가 -----
  /** GET /api/portfolios/{id}/categories @param {Id} id */
  categories: (id) => apiClient.get(`/portfolios/${id}/categories`),
  /** POST /api/portfolios/{id}/categories @param {Id} id @param {object} body {name, sortOrder?} */
  createCategory: (id, body) => apiClient.post(`/portfolios/${id}/categories`, body),
  /** PUT /api/portfolios/{id}/categories/{categoryId} @param {Id} id @param {Id} categoryId @param {object} body {name, sortOrder} */
  updateCategory: (id, categoryId, body) => apiClient.put(`/portfolios/${id}/categories/${categoryId}`, body),
  /** DELETE /api/portfolios/{id}/categories/{categoryId} (soft) @param {Id} id @param {Id} categoryId */
  removeCategory: (id, categoryId) => apiClient.delete(`/portfolios/${id}/categories/${categoryId}`),

  // ----- 보유 종목 → 구분 연결 (portfolio_asset_mapping) -----
  /** GET /api/portfolios/{id}/asset-mappings (보유 종목 + 연결된 구분, 미연결은 categoryId null) @param {Id} id */
  assetMappings: (id) => apiClient.get(`/portfolios/${id}/asset-mappings`),
  /** PUT /api/portfolios/{id}/asset-mappings/{stockId} @param {Id} id @param {Id} stockId @param {Id} categoryId */
  setAssetMapping: (id, stockId, categoryId) => apiClient.put(`/portfolios/${id}/asset-mappings/${stockId}`, { categoryId }),
  /** DELETE /api/portfolios/{id}/asset-mappings/{stockId} (연결 해제 → 미분류) @param {Id} id @param {Id} stockId */
  removeAssetMapping: (id, stockId) => apiClient.delete(`/portfolios/${id}/asset-mappings/${stockId}`),

  // ----- 목표비율 버전 (portfolio_target_version/item) — 구분별 비율, 합 100 -----
  /** GET /api/portfolios/{id}/targets @param {Id} id */
  targets: (id) => apiClient.get(`/portfolios/${id}/targets`),
  /** POST /api/portfolios/{id}/targets @param {Id} id @param {object} body {effectiveDate, memo, items[{categoryId, targetWeight}]} */
  createTarget: (id, body) => apiClient.post(`/portfolios/${id}/targets`, body),
  /** DELETE /api/portfolios/{id}/targets/{versionId} @param {Id} id @param {Id} versionId */
  removeTarget: (id, versionId) => apiClient.delete(`/portfolios/${id}/targets/${versionId}`),
  /** POST .../targets/{versionId}/restore @param {Id} id @param {Id} versionId */
  restoreTarget: (id, versionId) => apiClient.post(`/portfolios/${id}/targets/${versionId}/restore`),

  // ----- 평가/현황 (views) -----
  /** GET /api/portfolios/{id}/valuation (구분별 현재 vs 목표 비중, KRW) → {totalValueKrw, hasUnclassified, items[]} @param {Id} id */
  valuation: (id) => apiClient.get(`/portfolios/${id}/valuation`),
  /** GET /api/portfolios/{id}/positions (v_position) @param {Id} id */
  positions: (id) => apiClient.get(`/portfolios/${id}/positions`),
  /** GET /api/portfolios/{id}/cash-balances (v_cash_balance) @param {Id} id */
  cashBalances: (id) => apiClient.get(`/portfolios/${id}/cash-balances`)
};
