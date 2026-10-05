import { apiClient } from './apiClient';

/**
 * 인증/내 정보 API
 * WebAPI: AuthController (api/auth)
 */
export const authApi = {
  /** POST /api/auth/register @param {object} body {email, password, name} */
  register: (body) => apiClient.post('/auth/register', body),
  /** POST /api/auth/login → {userId, email, name, role, token, expiresAt, mustChangePassword} @param {object} body {email, password} */
  login: (body) => apiClient.post('/auth/login', body),
  // GET /api/auth/me
  me: () => apiClient.get('/auth/me'),
  /**
   * POST /api/auth/change-password (본인)
   * @param {object} body {currentPassword, newPassword}
   * @param {string} [token] 저장된 로그인 대신 쓸 토큰 (임시 비밀번호 로그인 직후 — 아직 로그인 상태로 저장하지 않음)
   */
  changePassword: (body, token) =>
    apiClient.post('/auth/change-password', body, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
};
