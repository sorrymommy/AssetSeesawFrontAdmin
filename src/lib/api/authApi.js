import { apiClient } from './apiClient';

/**
 * 인증/내 정보 API
 * WebAPI: AuthController (api/auth)
 */
export const authApi = {
  /** POST /api/auth/register @param {object} body {email, password, name} */
  register: (body) => apiClient.post('/auth/register', body),
  /** POST /api/auth/login @param {object} body {email, password} */
  login: (body) => apiClient.post('/auth/login', body),
  // GET /api/auth/me
  me: () => apiClient.get('/auth/me')
};
