import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const defaultValue = {
  isAuthenticated: false,
  token: null,
  user: null
};

const initialValue = browser ? JSON.parse(localStorage.getItem('auth') || JSON.stringify(defaultValue)) : defaultValue;

export const authStore = writable(initialValue);

if (browser) {
  authStore.subscribe(value => {
    localStorage.setItem('auth', JSON.stringify(value));
  });
}
