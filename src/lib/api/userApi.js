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
  /** PUT /api/users/{id} @param {Id} id @param {object} body {role, status} */
  update: (id, body) => apiClient.put(`/users/${id}`, body)
};

/** @type {Record<string, string>} 역할 표시명 */
export const USER_ROLE_LABELS = { USER: '사용자', ADMIN: '관리자' };

/** @type {Record<string, string>} 상태 표시명 */
export const USER_STATUS_LABELS = { ACTIVE: '활성', INACTIVE: '비활성', WITHDRAWN: '탈퇴' };
