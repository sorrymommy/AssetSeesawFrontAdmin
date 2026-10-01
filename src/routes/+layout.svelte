<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import GlobalLoading from '$lib/components/ui/GlobalLoading.svelte';
	import { onMount } from 'svelte';
	import { loadingStore } from '$lib/stores/loadingStore';
	import { setApiLoader } from '$lib/api/apiClient';

	let { children } = $props();

	onMount(() => {
		setApiLoader(loadingStore);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<GlobalLoading />
{@render children()}
