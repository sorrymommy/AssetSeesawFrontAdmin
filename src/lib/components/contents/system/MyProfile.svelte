<script>
  /**
   * 내 정보 [구현]
   * 프로필 조회(GET /api/auth/me) + 비밀번호 변경(POST /api/auth/change-password)
   * 비밀번호 변경: 현재 비밀번호 확인 필수, 새 비밀번호 8자 이상·현재와 다르게
   */
  import { onMount } from 'svelte';
  import { authStore } from '$lib/stores/authStore';
  import { authApi } from '$lib/api/authApi';
  import { USER_ROLE_LABELS, USER_STATUS_LABELS } from '$lib/api/userApi';

  /** @type {any} 서버에서 받은 프로필 (못 받으면 로그인 시 저장한 정보로 표시) */
  let profile = $state(null);
  const user = $derived(profile ?? $authStore?.user ?? {});

  let pw = $state({ current: '', next: '', confirm: '' });
  let isSaving = $state(false);
  let message = $state({ type: '', text: '' });

  /** @param {unknown} error */
  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  /** @param {any} v KST 기준 날짜 */
  function formatDate(v) {
    if (!v) return '-';
    return new Date(v).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
  }

  onMount(async () => {
    try {
      profile = await authApi.me();
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  });

  /** @param {SubmitEvent} e */
  async function changePassword(e) {
    e.preventDefault();
    message = { type: '', text: '' };
    if (!pw.current) return (message = { type: 'error', text: '현재 비밀번호를 입력하세요.' });
    if (pw.next.length < 8) return (message = { type: 'error', text: '새 비밀번호는 8자 이상이어야 합니다.' });
    if (pw.next !== pw.confirm) return (message = { type: 'error', text: '새 비밀번호 확인이 일치하지 않습니다.' });
    if (pw.next === pw.current) return (message = { type: 'error', text: '새 비밀번호가 현재 비밀번호와 같습니다.' });

    isSaving = true;
    try {
      await authApi.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      pw = { current: '', next: '', confirm: '' }; // 비밀번호를 화면 상태에 남기지 않는다
      message = { type: 'success', text: '비밀번호를 변경했습니다. 다음 로그인부터 새 비밀번호를 사용하세요.' };
    } catch (error) {
      message = { type: 'error', text: errorMessage(error) };
    } finally {
      isSaving = false;
    }
  }

  const inputClass = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2';
</script>

<div class="max-w-xl mx-auto p-6 space-y-8">
  <section>
    <h1 class="text-2xl font-bold text-gray-900 mb-6">내 정보</h1>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
      <div class="flex items-center justify-between px-6 py-4">
        <span class="text-sm text-gray-500">이름</span>
        <span class="text-sm font-medium text-gray-900">{user.name ?? '-'}</span>
      </div>
      <div class="flex items-center justify-between px-6 py-4">
        <span class="text-sm text-gray-500">이메일</span>
        <span class="text-sm font-medium text-gray-900">{user.email ?? '-'}</span>
      </div>
      <div class="flex items-center justify-between px-6 py-4">
        <span class="text-sm text-gray-500">역할</span>
        <span class="text-sm font-medium text-gray-900">{USER_ROLE_LABELS[user.role] ?? user.role ?? '-'}</span>
      </div>
      <div class="flex items-center justify-between px-6 py-4">
        <span class="text-sm text-gray-500">상태</span>
        <span class="text-sm font-medium text-gray-900">{USER_STATUS_LABELS[user.status] ?? user.status ?? '-'}</span>
      </div>
      <div class="flex items-center justify-between px-6 py-4">
        <span class="text-sm text-gray-500">가입일</span>
        <span class="text-sm font-medium text-gray-900">{formatDate(user.createdAt)}</span>
      </div>
    </div>
  </section>

  <section>
    <h2 class="text-lg font-semibold text-gray-900 mb-4">비밀번호 변경</h2>
    <form class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4" onsubmit={changePassword}>
      {#if message.text}
        <div class="rounded-lg border px-4 py-3 text-sm {message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}">
          {message.text}
        </div>
      {/if}
      <div>
        <label for="pw-current" class="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
        <input id="pw-current" type="password" autocomplete="current-password" bind:value={pw.current} class={inputClass} />
      </div>
      <div>
        <label for="pw-next" class="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
        <input id="pw-next" type="password" autocomplete="new-password" maxlength="100" bind:value={pw.next} placeholder="8자 이상" class={inputClass} />
      </div>
      <div>
        <label for="pw-confirm" class="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
        <input id="pw-confirm" type="password" autocomplete="new-password" maxlength="100" bind:value={pw.confirm} class={inputClass} />
      </div>
      <div class="flex justify-end">
        <button type="submit" disabled={isSaving} class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {isSaving ? '변경 중…' : '비밀번호 변경'}
        </button>
      </div>
    </form>
  </section>
</div>
