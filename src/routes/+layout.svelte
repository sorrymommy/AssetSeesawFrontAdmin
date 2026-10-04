<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import GlobalLoading from '$lib/components/ui/GlobalLoading.svelte';
	import { onMount } from 'svelte';
	import { loadingStore } from '$lib/stores/loadingStore';
	import { setApiLoader, setUnauthorizedHandler } from '$lib/api/apiClient';
	import { clearAuth } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children } = $props();

	onMount(() => {
		setApiLoader(loadingStore);
		// 토큰 만료·무효(401) → 로그아웃 후 로그인 화면으로
		setUnauthorizedHandler(() => {
			clearAuth();
			if (page.url.pathname !== '/login') goto('/login');
		});
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<GlobalLoading />
{@render children()}
