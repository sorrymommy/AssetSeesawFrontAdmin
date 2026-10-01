import { apiClient } from './apiClient';

/**
 * 리밸런싱 API (rebalancing_run / rebalancing_order)
 * WebAPI: RebalancingController
 * @typedef {string|number} Id
 */
export const rebalancingApi = {
  /** POST /api/portfolios/{portfolioId}/rebalancing/runs @param {Id} portfolioId @param {object} body {runDate?, bandThreshold?, memo} */
  createRun: (portfolioId, body) => apiClient.post(`/portfolios/${portfolioId}/rebalancing/runs`, body),
  /** GET /api/portfolios/{portfolioId}/rebalancing/runs @param {Id} portfolioId */
  runs: (portfolioId) => apiClient.get(`/portfolios/${portfolioId}/rebalancing/runs`),
  /** GET /api/rebalancing/runs/{runId} (주문 포함) @param {Id} runId */
  getRun: (runId) => apiClient.get(`/rebalancing/runs/${runId}`),
  /** PATCH /api/rebalancing/runs/{runId}/status @param {Id} runId @param {string} status PLANNED|EXECUTED|CANCELED */
  updateRunStatus: (runId, status) => apiClient.patch(`/rebalancing/runs/${runId}/status`, { status }),
  /** PATCH /api/rebalancing/orders/{orderId}/transaction @param {Id} orderId @param {Id} txId */
  linkOrderTransaction: (orderId, txId) => apiClient.patch(`/rebalancing/orders/${orderId}/transaction`, { txId })
};
