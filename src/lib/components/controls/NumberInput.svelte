<script>
  let {
    id = '',
    label = '',
    value = $bindable(''),
    placeholder = '',
    class: className = '',
    disabled = false,
    readonly = false,
    allowDecimal = false,
    step = 1,
    oninput = () => {}
  } = $props();

  function handleInput(event) {
    let rawValue = event.target.value;
    let numericValue;

    if (allowDecimal) {
      // Allow digits and one dot
      numericValue = rawValue.replace(/[^0-9.]/g, '');
      const parts = numericValue.split('.');
      if (parts.length > 2) {
        // If more than one dot, keep only the first two parts joined by a dot
        numericValue = parts[0] + '.' + parts.slice(1).join('');
      }
    } else {
      // Remove non-numeric characters (keep only digits)
      numericValue = rawValue.replace(/[^0-9]/g, '');
    }

    // Update the value only if it changed
    if (value !== numericValue) {
      value = numericValue;
    }

    // Force the input value to match the sanitized value
    event.target.value = numericValue;

    oninput(event);
  }

  function increment() {
    if (disabled || readonly) return;
    let current = parseFloat(value);
    if (isNaN(current)) current = 0;

    let nextValue = current + step;

    // Handle floating point precision issues
    if (allowDecimal) {
      // Count decimals in step to determine precision
      const stepString = step.toString();
      const decimals = stepString.includes('.') ? stepString.split('.')[1].length : 0;
      nextValue = parseFloat(nextValue.toFixed(decimals));
    }

    value = nextValue.toString();
  }

  function decrement() {
    if (disabled || readonly) return;
    let current = parseFloat(value);
    if (isNaN(current)) current = 0;

    let nextValue = current - step;

    // Handle floating point precision issues
    if (allowDecimal) {
      const stepString = step.toString();
      const decimals = stepString.includes('.') ? stepString.split('.')[1].length : 0;
      nextValue = parseFloat(nextValue.toFixed(decimals));
    }

    if (nextValue >= 0) {
      value = nextValue.toString();
    }
  }
</script>

<div class={className}>
  {#if label}
    <label for={id} class="block text-xs font-medium text-gray-700 mb-1">{label}</label>
  {/if}
  <div class="relative">
    <input
      type="text"
      {id}
      bind:value
      {placeholder}
      {disabled}
      {readonly}
      oninput={handleInput}
      class="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border disabled:bg-gray-100 disabled:text-gray-500 pr-6"
    />
    <div class="absolute inset-y-0 right-0 flex flex-col border-l border-gray-300">
      <button
        type="button"
        onclick={increment}
        disabled={disabled || readonly}
        class="flex-1 px-1 hover:bg-gray-100 text-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed rounded-tr"
        tabindex="-1"
      >
        <svg class="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
      </button>
      <button
        type="button"
        onclick={decrement}
        disabled={disabled || readonly}
        class="flex-1 px-1 hover:bg-gray-100 text-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-300 rounded-br"
        tabindex="-1"
      >
        <svg class="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>
    </div>
  </div>
</div>
