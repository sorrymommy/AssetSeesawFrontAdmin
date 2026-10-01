<script>
  /**
   * 등록/수정 공용 팝업 셸.
   * - 본문은 children 스니펫으로 주입 (폼 필드)
   * - 하단 버튼: 취소 + (onSave 있을 때) 저장
   */
  import UiButton from '$lib/components/controls/Button.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';

  let {
    isOpen = $bindable(false),
    title = '',
    width = 'max-w-md',
    saveLabel = 'Save',
    onSave = undefined,         // 있으면 저장 버튼 노출, () => void
    children = undefined
  } = $props();

  function close() {
    isOpen = false;
  }

  function save() {
    if (onSave) onSave();
    isOpen = false;
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div class="bg-white rounded-lg shadow-xl w-full {width} mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 class="text-lg font-semibold text-gray-800">{title}</h3>
        <button onclick={close} aria-label="닫기" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {@render children?.()}
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
        <UiButton label="Cancel" color={BUTTON_COLORS.GRAY} onclick={close} />
        {#if onSave}
          <UiButton label={saveLabel} color={BUTTON_COLORS.INDIGO} onclick={save} />
        {/if}
      </div>
    </div>
  </div>
{/if}
