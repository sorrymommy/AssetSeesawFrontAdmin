import { apiClient } from './apiClient';

/**
 * 종목 마스터 API (stock)
 * WebAPI: StocksController (api/stocks)
 * 조회는 전체 사용자, 등록/수정은 ADMIN 전용.
 * @typedef {string|number} Id
 */
export const stockApi = {
  /** GET /api/stocks?market&query @param {Record<string, any>} [params] */
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return apiClient.get(`/stocks${qs ? `?${qs}` : ''}`);
  },
  /** GET /api/stocks/{id} @param {Id} id */
  get: (id) => apiClient.get(`/stocks/${id}`),
  /** POST /api/stocks [ADMIN] @param {object} body {ticker, name, market, currency} */
  create: (body) => apiClient.post('/stocks', body),
  /** PUT /api/stocks/{id} [ADMIN] @param {Id} id @param {object} body {name, isActive} */
  update: (id, body) => apiClient.put(`/stocks/${id}`, body),
  /** GET /api/stocks/{id}/prices?from&to (daily_price OHLCV) @param {Id} id @param {Record<string, any>} [params] */
  prices: (id, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return apiClient.get(`/stocks/${id}/prices${qs ? `?${qs}` : ''}`);
  }
};
