<script>
  import { loadingStore } from '$lib/stores/loadingStore';
  import { fade } from 'svelte/transition';
</script>

{#if $loadingStore}
  <div
    class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
    transition:fade={{ duration: 200 }}
  >
    <div class="relative">
      <!-- Outer Ring -->
      <div class="w-12 h-12 rounded-full border-4 border-indigo-200 opacity-50"></div>
      <!-- Inner Spinning Ring -->
      <div class="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
    </div>
  </div>
{/if}
