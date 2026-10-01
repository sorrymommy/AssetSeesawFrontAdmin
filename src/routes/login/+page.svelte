<script>
  import { goto } from '$app/navigation';
  import Button from '$lib/components/Button.svelte';
  import { APP_CONFIG } from '$lib/constants';
  import { authStore } from '$lib/stores/authStore';
  import { authApi } from '$lib/api/authApi';

  let email = $state('');
  let password = $state('');
  let isLoading = $state(false);
  let errorMessage = $state('');

  /** @param {Event} e */
  async function handleLogin(e) {
    e.preventDefault();
    isLoading = true;
    errorMessage = '';

    try {
      // WebAPI: POST /api/auth/login → { userId, email, name, role, token, expiresAt }
      const res = await authApi.login({ email, password });

      authStore.set({
        isAuthenticated: true,
        token: res.token,
        user: {
          userId: res.userId,
          email: res.email,
          name: res.name,
          role: res.role
        }
      });
      goto('/');
    } catch (/** @type {any} */ err) {
      errorMessage = err?.message || '로그인에 실패했습니다.';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="min-h-screen flex font-sans text-gray-900 bg-gray-50">
  <!-- Left Side - Image/Brand -->
  <div class="hidden lg:flex lg:w-1/2 bg-indigo-600 items-center justify-center relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-90"></div>
    <!-- Background Pattern -->
    <div class="absolute inset-0 opacity-20" style="background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>

    <div class="relative z-10 text-white text-center px-12 max-w-xl">
      <div class="mb-8 flex justify-center">
        <div class="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border border-white/20">
          <span class="text-5xl font-bold">{APP_CONFIG.appName[0]}</span>
        </div>
      </div>
      <h2 class="text-5xl font-bold mb-6 tracking-tight">Welcome to {APP_CONFIG.appName}</h2>
      <p class="text-xl text-indigo-100 leading-relaxed font-light">
        Experience the next generation of admin dashboards. Powerful, beautiful, and easy to use.
      </p>

      <!-- Decorative circles -->
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl mix-blend-overlay"></div>
      <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl mix-blend-overlay"></div>
    </div>
  </div>

  <!-- Right Side - Login Form -->
  <div class="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-white">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center lg:text-left">
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Sign in to your account</h1>
        <p class="mt-2 text-gray-500">Enter your details to access the admin panel</p>
      </div>

      {#if errorMessage}
        <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      {/if}

      <form class="mt-10 space-y-6" onsubmit={handleLogin}>
        <div class="space-y-5">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
            <div class="mt-1 relative">
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                bind:value={email}
                class="block w-full px-4 py-3 rounded-xl border border-gray-200 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all bg-gray-50 focus:bg-white"
                placeholder="admin@example.com"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
            <div class="mt-1 relative">
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                bind:value={password}
                class="block w-full px-4 py-3 rounded-xl border border-gray-200 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all bg-gray-50 focus:bg-white"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label for="remember-me" class="ml-2 block text-sm text-gray-600">Remember me</label>
          </div>
        </div>

        <div>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            class="w-full justify-center py-3.5 text-base shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40"
          >
            {#if isLoading}
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            {:else}
              Sign in
            {/if}
          </Button>
        </div>
      </form>


    </div>
  </div>
</div>
