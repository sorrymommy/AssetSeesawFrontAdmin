<script>
  import { tabStore } from '$lib/stores/tabStore';

  // Subscribe to store
  let { tabs, activeTabId } = $state({ tabs: [], activeTabId: null });

  $effect(() => {
    const unsubscribe = tabStore.subscribe(value => {
      tabs = value.tabs;
      activeTabId = value.activeTabId;
    });
    return unsubscribe;
  });

  function handleClose(e, id) {
    e.stopPropagation();
    tabStore.closeTab(id);
  }
</script>

<div class="flex flex-wrap items-center border-b border-gray-200 bg-white px-2 pt-2 gap-1">
  {#each tabs as tab (tab.id)}
    <button
      onclick={() => tabStore.setActiveTab(tab.id)}
      class="group relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-t border-l border-r border-transparent hover:bg-gray-50 transition-colors
      {activeTabId === tab.id
        ? 'bg-white text-indigo-600 border-gray-200 !border-b-white -mb-px z-10'
        : 'text-gray-500 hover:text-gray-700 bg-gray-100 border-b-gray-200'}"
    >
      <span>{tab.label}</span>
      <span
        role="button"
        tabindex="0"
        onclick={(e) => handleClose(e, tab.id)}
        onkeydown={(e) => e.key === 'Enter' && handleClose(e, tab.id)}
        class="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity {activeTabId === tab.id ? 'opacity-100' : ''}"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </span>
    </button>
  {/each}
</div>
