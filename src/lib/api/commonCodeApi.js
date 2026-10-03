import { apiClient } from './apiClient';

/**
 * 공통 코드 API
 * WebAPI: CommonCodesController (api/common-codes)
 * 조회는 로그인한 모든 사용자, 변경은 ADMIN. 시스템 그룹은 표시명·순서·설명만 수정 가능.
 */
export const commonCodeApi = {
  // GET /api/common-codes → [{groupCode, name, description, isSystem, codes:[{code, name, description, sortOrder, isActive}]}]
  list: () => apiClient.get('/common-codes'),
  /** POST /api/common-codes/{group}/codes [ADMIN] @param {string} group @param {object} body {code, name, description?, sortOrder?} */
  createCode: (group, body) => apiClient.post(`/common-codes/${group}/codes`, body),
  /** PUT /api/common-codes/{group}/codes/{code} [ADMIN] @param {string} group @param {string} code @param {object} body {name, description, sortOrder, isActive} */
  updateCode: (group, code, body) => apiClient.put(`/common-codes/${group}/codes/${encodeURIComponent(code)}`, body),
  /** DELETE /api/common-codes/{group}/codes/{code} [ADMIN] @param {string} group @param {string} code */
  removeCode: (group, code) => apiClient.delete(`/common-codes/${group}/codes/${encodeURIComponent(code)}`)
};
