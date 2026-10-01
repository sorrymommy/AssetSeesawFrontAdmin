import { writable } from 'svelte/store';

function createLoadingStore() {
  const { subscribe, set, update } = writable(false);

  return {
    subscribe,
    show: () => set(true),
    hide: () => set(false),
    toggle: () => update(n => !n)
  };
}

export const loadingStore = createLoadingStore();
