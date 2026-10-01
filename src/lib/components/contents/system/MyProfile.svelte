<script>
  /** 내 정보 [구현] — GET /api/auth/me */
  import { authStore } from '$lib/stores/authStore';
  // import { authApi } from '$lib/api/authApi';  // 연동 단계에서 me() 호출

  const user = $derived($authStore?.user ?? {});
</script>

<div class="max-w-xl mx-auto p-6">
  <h1 class="text-2xl font-bold text-gray-900 mb-6">내 정보</h1>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
    <div class="flex items-center justify-between px-6 py-4">
      <span class="text-sm text-gray-500">이름</span>
      <span class="text-sm font-medium text-gray-900">{user.name ?? '-'}</span>
    </div>
    <div class="flex items-center justify-between px-6 py-4">
      <span class="text-sm text-gray-500">역할</span>
      <span class="text-sm font-medium text-gray-900">{user.role ?? '-'}</span>
    </div>
    <div class="flex items-center justify-between px-6 py-4">
      <span class="text-sm text-gray-500">이메일</span>
      <span class="text-sm font-medium text-gray-900">{user.email ?? '-'}</span>
    </div>
  </div>
  <p class="text-xs text-gray-400 mt-3">프로필 정보는 GET /api/auth/me 로 조회합니다. (연동 예정)</p>
</div>
