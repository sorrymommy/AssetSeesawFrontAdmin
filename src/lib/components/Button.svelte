<script>
  let {
    type = 'button',
    variant = 'primary',
    disabled = false,
    children,
    class: className = '',
    ...rest
  } = $props();

  const baseClasses = "inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-base cursor-pointer transition-all duration-200 ease-in-out border-none outline-none font-inherit active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none";

  const variantClasses = {
    primary: "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-600/20 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30",
    secondary: "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200 hover:text-gray-900",
    danger: "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md shadow-red-600/20 hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:shadow-red-600/30"
  };
</script>

<button
  {type}
  class="{baseClasses} {variantClasses[variant]} {className}"
  {disabled}
  {...rest}
>
  {@render children?.()}
</button>
