<script>
  import { BUTTON_COLORS } from '$lib/constants.js';

  let {
    label = '',
    color = BUTTON_COLORS.INDIGO,
    iconType = '',
    onclick = () => {},
    class: className = ''
  } = $props();

  const colorClasses = {
    [BUTTON_COLORS.INDIGO]: 'bg-indigo-600 hover:bg-indigo-700',
    [BUTTON_COLORS.EMERALD]: 'bg-emerald-600 hover:bg-emerald-700',
    [BUTTON_COLORS.ROSE]: 'bg-rose-600 hover:bg-rose-700',
    [BUTTON_COLORS.BLUE]: 'bg-blue-600 hover:bg-blue-700',
    [BUTTON_COLORS.AMBER]: 'bg-amber-600 hover:bg-amber-700',
    [BUTTON_COLORS.TEAL]: 'bg-teal-600 hover:bg-teal-700',
    [BUTTON_COLORS.SLATE]: 'bg-slate-600 hover:bg-slate-700',
    [BUTTON_COLORS.GRAY]: 'bg-gray-600 hover:bg-gray-700',
    [BUTTON_COLORS.RED]: 'bg-red-600 hover:bg-red-700',
    [BUTTON_COLORS.GREEN]: 'bg-green-600 hover:bg-green-700',
    [BUTTON_COLORS.YELLOW]: 'bg-yellow-600 hover:bg-yellow-700',
    [BUTTON_COLORS.PURPLE]: 'bg-purple-600 hover:bg-purple-700',
    [BUTTON_COLORS.PINK]: 'bg-pink-600 hover:bg-pink-700',
  };

  const selectedColorClass = colorClasses[color] || colorClasses[BUTTON_COLORS.INDIGO];
</script>

<button
  type="button"
  {onclick}
  class="px-3 py-1.5 text-white rounded transition-colors text-xs font-medium shadow-sm flex items-center gap-1 {selectedColorClass} {className}"
>
  {#if iconType === 'search'}
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
  {:else if iconType === 'add'}
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
  {:else if iconType === 'remove'}
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
  {:else if iconType === 'save'}
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
  {:else if iconType === 'import'}
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
  {:else if iconType === 'export'}
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
  {:else if iconType === 'print'}
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
  {/if}
  {label}
</button>
