<script>
  /**
   * 다중 선택 콤보박스 — 펼치면 체크박스 목록, 아무것도 고르지 않으면 placeholder(예: '전체')
   * value: 선택한 option.value 배열 (bind:value)
   * @typedef {Object} Option
   * @property {string|number} value
   * @property {string} label
   */
  import { onMount, onDestroy } from 'svelte';

  /**
   * @type {{
   *  id?: string,
   *  label?: string,
   *  options: Option[],
   *  value?: Array<string|number>,
   *  placeholder?: string,
   *  class?: string,
   *  onchange?: (value: Array<string|number>) => void
   * }}
   */
  let {
    id = '',
    label = '',
    options = [],
    value = $bindable([]),
    placeholder = '전체',
    class: className = '',
    onchange = () => {}
  } = $props();

  let open = $state(false);
  /** @type {HTMLElement} */
  let root;

  const summaryText = $derived.by(() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) return options.find((o) => o.value === value[0])?.label ?? placeholder;
    return `${value.length}개 선택`;
  });

  /** @param {string|number} v */
  function toggle(v) {
    value = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
    onchange(value);
  }

  function clear() {
    value = [];
    onchange(value);
  }

  /** 바깥을 누르면 닫는다 @param {MouseEvent} e */
  function handleDocumentClick(e) {
    if (open && root && !root.contains(/** @type {Node} */ (e.target))) open = false;
  }

  onMount(() => document.addEventListener('click', handleDocumentClick));
  onDestroy(() => document.removeEventListener('click', handleDocumentClick));
</script>

<div class="relative {className}" bind:this={root}>
  {#if label}
    <label for={id} class="block text-xs font-medium text-gray-700 mb-1">{label}</label>
  {/if}
  <button
    {id}
    type="button"
    class="flex w-full items-center justify-between rounded border border-gray-300 bg-white shadow-sm text-xs px-2 py-1.5 text-left focus:border-indigo-500 focus:ring-indigo-500"
    onclick={() => (open = !open)}
  >
    <span class="truncate">{summaryText}</span>
    <svg class="ml-2 size-3 shrink-0 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" /></svg>
  </button>

  {#if open}
    <div class="absolute z-20 mt-1 min-w-full w-max max-w-md max-h-60 overflow-y-auto rounded border border-gray-200 bg-white shadow-lg text-xs">
      <label class="flex items-center gap-2 px-2 py-1.5 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
        <input type="checkbox" checked={value.length === 0} onchange={clear} />
        <span>{placeholder}</span>
      </label>
      {#each options as option (option.value)}
        <label class="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" checked={value.includes(option.value)} onchange={() => toggle(option.value)} />
          <span class="truncate">{option.label}</span>
        </label>
      {/each}
      {#if options.length === 0}
        <div class="px-2 py-1.5 text-gray-400">항목 없음</div>
      {/if}
    </div>
  {/if}
</div>
