/**
 * Common API Client Module
 * Handles HTTP requests to external APIs with error handling and common configurations.
 *
 * Usage:
 * 1. Setup Global Loader (e.g., in +layout.svelte):
 *    import { setApiLoader } from '$lib/api/apiClient';
 *    import { loadingStore } from '$lib/stores/loadingStore';
 *    setApiLoader(loadingStore);
 *
 * 2. Request Options:
 *    - Default (uses global loader): apiClient.get('/users')
 *    - No Loader: apiClient.get('/users', { useLoader: false })
 *    - Custom Loader: apiClient.get('/users', { loader: customLoader })
 */

// loadingStore import removed for dependency injection
let globalLoader = null;

export const setApiLoader = (loader) => {
  globalLoader = loader;
};

// AssetSeesaw WebAPI (ASP.NET Core) — dev default. Override via .env (VITE_API_BASE_URL)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7139/api';

/**
 * authStore(localStorage 'auth')에 저장된 JWT를 읽는다.
 * store를 직접 import하지 않아 순환 의존을 피한다.
 * @returns {string|null}
 */
function getToken() {
  if (typeof localStorage === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('auth') || '{}').token ?? null;
  } catch {
    return null;
  }
}

async function request(endpoint, options = {}) {
  const { useLoader = true, loader = null, ...fetchOptions } = options;
  const activeLoader = loader || globalLoader;

  if (useLoader && activeLoader?.show) {
    activeLoader.show();
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...fetchOptions.headers,
  };

  const config = {
    ...fetchOptions,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || `API Error: ${response.status} ${response.statusText}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Failed:', error);
    throw error;
  } finally {
    if (useLoader && activeLoader?.hide) {
      activeLoader.hide();
    }
  }
}

async function mockRequest(data, delay = 500) {
  if (globalLoader?.show) globalLoader.show();
  return new Promise((resolve) => {
    setTimeout(() => {
      if (globalLoader?.hide) globalLoader.hide();
      resolve(data);
    }, delay);
  });
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
  mock: (data, delay) => mockRequest(data, delay),
};
