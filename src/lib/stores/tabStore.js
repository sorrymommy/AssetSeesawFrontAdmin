import { writable } from 'svelte/store';

/**
 * @typedef {Object} Tab
 * @property {string} id - Unique identifier (usually the path or label)
 * @property {string} label - Display name
 * @property {any} component - The component to render
 * @property {Object} [props] - Props to pass to the component
 */

function createTabStore() {
  const { subscribe, set, update } = writable({
    /** @type {Tab[]} */
    tabs: [],
    /** @type {string | null} */
    activeTabId: null
  });

  return {
    subscribe,
    /**
     * Open a new tab or switch to it if already open
     * @param {Tab} tab
     */
    openTab: (tab) => update(state => {
      const existing = state.tabs.find(t => t.id === tab.id);
      if (existing) {
        return { ...state, activeTabId: tab.id };
      }
      return {
        tabs: [...state.tabs, tab],
        activeTabId: tab.id
      };
    }),
    /**
     * Close a tab
     * @param {string} id
     */
    closeTab: (id) => update(state => {
      const newTabs = state.tabs.filter(t => t.id !== id);
      let newActiveId = state.activeTabId;

      // If closing active tab, switch to the last one or null
      if (state.activeTabId === id) {
        newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      }

      return { tabs: newTabs, activeTabId: newActiveId };
    }),
    /**
     * Set active tab
     * @param {string} id
     */
    setActiveTab: (id) => update(state => ({ ...state, activeTabId: id })),
    /** Close all tabs (on logout — the next login starts fresh) */
    closeAll: () => set({ tabs: [], activeTabId: null })
  };
}

export const tabStore = createTabStore();
