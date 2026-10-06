import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { tabStore } from './tabStore';

const defaultValue = {
  isAuthenticated: false,
  token: null,
  user: null
};

/**
 * JWT의 exp(초)가 지났는지 — 해석할 수 없는 토큰도 만료로 본다.
 * @param {string|null|undefined} token
 */
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

/** 저장된 인증 정보 — 토큰이 만료됐으면 로그아웃 상태로 시작한다 */
function loadInitialValue() {
  if (!browser) return defaultValue;
  try {
    const saved = JSON.parse(localStorage.getItem('auth') || 'null');
    return saved?.isAuthenticated && !isTokenExpired(saved.token) ? saved : defaultValue;
  } catch {
    return defaultValue;
  }
}

const initialValue = loadInitialValue();

export const authStore = writable(initialValue);

/** 로그아웃 — 저장된 인증 정보와 열린 탭을 지운다 (화면 이동은 호출하는 쪽에서) */
export function clearAuth() {
  authStore.set(defaultValue);
  tabStore.closeAll();
}

if (browser) {
  authStore.subscribe(value => {
    localStorage.setItem('auth', JSON.stringify(value));
  });
}
