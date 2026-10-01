<script>
  /**
   * 자산 종합 대시보드 [구현*]
   * 기존 엔드포인트 조합: /portfolios + /portfolios/{id}/valuation
   * (현재는 요약 카드 골격, 실제 집계는 다음 단계에서 연동)
   */
  const summary = [
    { label: '총 평가액 (KRW)', value: '₩ 0', sub: '보유 + 현금' },
    { label: '보유 종목 수', value: '0', sub: '전체 포트폴리오' },
    { label: '현금 비중', value: '0.0%', sub: '목표 대비' },
    { label: '리밸런싱 필요', value: '0', sub: '밴드 이탈 종목' }
  ];
</script>

<div class="p-6">
  <h1 class="text-2xl font-bold text-gray-900 mb-1">자산 종합 대시보드</h1>
  <p class="text-sm text-gray-500 mb-6">포트폴리오 평가·보유·현금 현황을 한눈에 봅니다. (집계 연동 예정)</p>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
    {#each summary as s}
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h3 class="text-xs font-medium text-gray-500 mb-2">{s.label}</h3>
        <p class="text-2xl font-bold text-gray-900">{s.value}</p>
        <p class="text-xs text-gray-400 mt-1">{s.sub}</p>
      </div>
    {/each}
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 min-h-[240px]">
      <h2 class="text-sm font-semibold text-gray-700 mb-3">자산 배분 (현재 vs 목표)</h2>
      <div class="flex items-center justify-center h-44 text-gray-300 text-sm">차트 영역 (연동 예정)</div>
    </div>
    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 min-h-[240px]">
      <h2 class="text-sm font-semibold text-gray-700 mb-3">포트폴리오별 평가</h2>
      <div class="flex items-center justify-center h-44 text-gray-300 text-sm">목록 영역 (연동 예정)</div>
    </div>
  </div>
</div>
