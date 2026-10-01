<script>
  import { page } from '$app/stores';
  import Button from './Button.svelte';
  import { APP_CONFIG } from '$lib/constants';

  /**
   * @typedef {Object} User
   * @property {string} name
   * @property {string} [avatar]
   * @property {string} role
   */

  /**
   * @typedef {Object} MenuItem
   * @property {string} label
   * @property {string} href
   * @property {() => void} [onClick]
   * @property {boolean} [isActive]
   */

  /**
   * @type {{ user: User, gnbItems: MenuItem[], onLogout: () => void }}
   */
  let {
    user = { name: 'Guest', role: 'Viewer' },
    gnbItems = [],
    onLogout = () => {}
  } = $props();

  let isProfileOpen = $state(false);

  function toggleProfile() {
    isProfileOpen = !isProfileOpen;
  }
</script>

<header class="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between sticky top-0 z-10">
  <!-- Left: Logo -->
  <div class="flex items-center gap-3">
    <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
      {APP_CONFIG.appName[0]}
    </div>
    <span class="text-xl font-bold text-gray-800 tracking-tight">{APP_CONFIG.appName}</span>
  </div>

  <!-- Center: GNB -->
  <nav class="hidden md:flex items-center gap-8">
    {#each gnbItems as item}
      {#if item.onClick}
        <button
          type="button"
          onclick={(e) => {
            e.preventDefault();
            item.onClick();
          }}
          class="text-sm font-medium transition-colors duration-200 cursor-pointer
          {item.isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}"
        >
          {item.label}
        </button>
      {:else}
        <a
          href={item.href}
          class="text-sm font-medium transition-colors duration-200
          {$page.url.pathname === item.href ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}"
        >
          {item.label}
        </a>
      {/if}
    {/each}
  </nav>

  <!-- Right: User Profile & Logout -->
  <div class="flex items-center gap-4">
    <div class="relative">
      <button
        onclick={toggleProfile}
        class="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      >
        <div class="text-right hidden sm:block">
          <p class="text-sm font-semibold text-gray-700 leading-none">{user.name}</p>
          <p class="text-xs text-gray-500 mt-1">{user.role}</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
          {#if user.avatar}
            <img src={user.avatar} alt={user.name} class="w-full h-full object-cover" />
          {:else}
            <div class="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold text-lg">
              {user.name[0]}
            </div>
          {/if}
        </div>
      </button>

      <!-- Dropdown Menu -->
      {#if isProfileOpen}
        <div class="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
          <div class="px-4 py-3 border-b border-gray-50 sm:hidden">
            <p class="text-sm font-semibold text-gray-900">{user.name}</p>
            <p class="text-xs text-gray-500">{user.role}</p>
          </div>
          <a href="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Profile</a>
          <a href="/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Settings</a>
          <div class="border-t border-gray-50 my-1"></div>
          <button
            onclick={onLogout}
            class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      {/if}
    </div>
  </div>
</header>

<!-- Click outside to close dropdown (simple implementation) -->
<svelte:window onclick={(e) => {
  const target = /** @type {Element} */ (e.target);
  if (isProfileOpen && target?.closest && !target.closest('.relative')) {
    isProfileOpen = false;
  }
}} />
