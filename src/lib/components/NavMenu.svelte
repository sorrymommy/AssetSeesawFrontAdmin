<script>
  import { page } from '$app/stores';
  import { slide } from 'svelte/transition';
  import { APP_CONFIG } from '$lib/constants';

  /**
   * @typedef {Object} MenuItem
   * @property {string} label
   * @property {string} [href]
   * @property {string} [icon]
   * @property {() => void} [onClick]
   * @property {MenuItem[]} [children]
   */

  /**
   * @type {{ items: MenuItem[] }}
   */
  let { items = [] } = $props();

  // Track expanded state for submenus
  let expanded = $state({});

  // Expand all items by default when items change
  $effect(() => {
    const newExpanded = {};
    const expandRecursive = (items) => {
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          newExpanded[item.label] = true;
          expandRecursive(item.children);
        }
      });
    };
    expandRecursive(items);
    expanded = newExpanded;
  });

  function toggle(label) {
    // Svelte 5 state mutation
    expanded[label] = !expanded[label];
  }

  function handleClick(e, item) {
    // Always prevent default for items with children or custom onClick
    if ((item.children && item.children.length > 0) || item.onClick) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (item.children && item.children.length > 0) {
      toggle(item.label);
    } else if (item.onClick) {
      item.onClick();
    }
  }

  function isChildActive(item) {
    if (item.href === $page.url.pathname) return true;
    if (item.children) {
      return item.children.some(child => isChildActive(child));
    }
    return false;
  }
</script>

<nav class="w-64 bg-white border-r border-gray-200 flex flex-col">
  <div class="flex-1 overflow-y-auto py-4 px-3">
    <ul class="space-y-1">
      {#each items as item}
        {@render menuItem(item)}
      {/each}
    </ul>
  </div>

  <div class="bg-white border-t border-gray-200 py-4 px-8">
    <div class="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 justify-center">
      <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
      <span class="font-mono text-xs font-medium text-gray-600">{APP_CONFIG.version}</span>
    </div>
  </div>
</nav>

{#snippet menuItem(item)}
  {@const hasChildren = item.children && item.children.length > 0}
  {@const isActive = item.href === $page.url.pathname}
  {@const isExpanded = expanded[item.label] || isChildActive(item)}
  {@const activeClass = isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}

  <li>
    {#if hasChildren}
      <button
        type="button"
        onclick={(e) => handleClick(e, item)}
        class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
      >
        <div class="flex items-center gap-3 pointer-events-none">
          {#if item.icon}
            <span class="w-5 h-5 text-gray-400">{@html item.icon}</span>
          {/if}
          <span>{item.label}</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="w-4 h-4 transition-transform duration-200 {isExpanded ? 'rotate-90' : ''} pointer-events-none"
        >
          <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
        </svg>
      </button>

      {#if isExpanded}
        <ul class="pl-4 mt-1 space-y-1" transition:slide={{ duration: 200 }}>
          {#each item.children as child}
            {@render menuItem(child)}
          {/each}
        </ul>
      {/if}
    {:else}
      <a
        href={item.href || '#'}
        onclick={(e) => handleClick(e, item)}
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {activeClass} cursor-pointer"
      >
        {#if item.icon}
          <span class="w-5 h-5 {isActive ? 'text-indigo-600' : 'text-gray-400'}">{@html item.icon}</span>
        {/if}
        <span>{item.label}</span>
      </a>
    {/if}
  </li>
{/snippet}
