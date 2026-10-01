<script>
  /** 향후 구현 예정 메뉴용 placeholder */
  let {
    title = '',
    note = '준비 중입니다.',
    badge = '향후 구현 예정'
  } = $props();
</script>

<div class="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
  <div class="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
    <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
  </div>
  <div class="text-lg font-semibold text-gray-700">{title}</div>
  <div class="text-sm text-gray-400 mt-1">{note}</div>
  <span class="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">{badge}</span>
</div>
