import { apiClient } from './apiClient';

/**
 * 사용자 관리 API [ADMIN]
 * WebAPI: UsersController (api/users)
 * @typedef {string|number} Id
 */
export const userApi = {
  /** GET /api/users?query&role&status @param {Record<string, any>} [params] */
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return apiClient.get(`/users${qs ? `?${qs}` : ''}`);
  },
  /** POST /api/users (관리자가 등록, 상태 ACTIVE) @param {object} body {email, password, name, role} */
  create: (body) => apiClient.post('/users', body),
  /** PUT /api/users/{id} @param {Id} id @param {object} body {role, status} */
  update: (id, body) => apiClient.put(`/users/${id}`, body),
  /** POST /api/users/{id}/reset-password → {userId, email, temporaryPassword} (임시 비밀번호는 이 응답에서만) @param {Id} id */
  resetPassword: (id) => apiClient.post(`/users/${id}/reset-password`, {})
};
