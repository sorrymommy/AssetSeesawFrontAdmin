<script>
  /**
   * @typedef {Object} Option
   * @property {string|number} value
   * @property {string} label
   */

  /**
   * @type {{
   *  id?: string,
   *  label?: string,
   *  options: Option[],
   *  value?: string|number,
   *  placeholder?: string,
   *  class?: string,
   *  onchange?: (event: Event) => void
   * }}
   */
  let {
    id = '',
    label = '',
    options = [],
    value = $bindable(''),
    placeholder = 'Select an option',
    class: className = '',
    onchange = () => {}
  } = $props();
</script>

<div class={className}>
  {#if label}
    <label for={id} class="block text-xs font-medium text-gray-700 mb-1">{label}</label>
  {/if}
  <select
    {id}
    bind:value
    {onchange}
    class="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border"
  >
    {#if placeholder}
      <option value="">{placeholder}</option>
    {/if}
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>
