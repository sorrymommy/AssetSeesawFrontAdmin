<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import NavMenu from '$lib/components/NavMenu.svelte';
  import TabBar from '$lib/components/TabBar.svelte';
  import { tabStore } from '$lib/stores/tabStore';
  import { authStore } from '$lib/stores/authStore';
  import { APP_CONFIG } from '$lib/constants';

  // ── 대분류 1. 대시보드
  import AssetDashboard from '$lib/components/contents/dashboard/AssetDashboard.svelte';
  import PositionList from '$lib/components/contents/holdings/PositionList.svelte';
  import CashBalanceList from '$lib/components/contents/holdings/CashBalanceList.svelte';
  // ── 대분류 2. 포트폴리오
  import PortfolioManagement from '$lib/components/contents/portfolio/PortfolioManagement.svelte';
  import TargetWeightManagement from '$lib/components/contents/portfolio/TargetWeightManagement.svelte';
  import PortfolioValuation from '$lib/components/contents/portfolio/PortfolioValuation.svelte';
  // ── 대분류 3. 리밸런싱
  import RebalancingRunList from '$lib/components/contents/rebalancing/RebalancingRunList.svelte';
  // ── 대분류 4. 거래·계좌
  import AccountManagement from '$lib/components/contents/account/AccountManagement.svelte';
  import TransactionList from '$lib/components/contents/transaction/TransactionList.svelte';
  // ── 대분류 5. 기준정보
  import StockManagement from '$lib/components/contents/stock/StockManagement.svelte';
  import ExchangeRateList from '$lib/components/contents/master/ExchangeRateList.svelte';
  // ── 대분류 6. 시스템 관리 [ADMIN]
  import UserManagement from '$lib/components/contents/system/UserManagement.svelte';
  import MyProfile from '$lib/components/contents/system/MyProfile.svelte';
  import DataCollectionStatus from '$lib/components/contents/system/DataCollectionStatus.svelte';
  import CommonCodeManagement from '$lib/components/contents/system/CommonCodeManagement.svelte';

  const user = $derived($authStore?.user ?? { name: 'Guest', role: 'USER' });
  const isAdmin = $derived(user.role === 'ADMIN');

  const appInfo = { companyName: APP_CONFIG.companyName, version: APP_CONFIG.version };

  // 메뉴 아이콘 (heroicons outline)
  const ICON = {
    chart: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" /></svg>`,
    wallet: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" /></svg>`,
    briefcase: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 5.006c-.194.165-.42.295-.668.386a41.18 41.18 0 0 1-15.664 0 4.494 4.494 0 0 1-.668-.386m16.5 0V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m-7.5 0V5.25A2.25 2.25 0 0 1 9 3h6a2.25 2.25 0 0 1 2.25 2.25v.894m-15 0a4.498 4.498 0 0 0-.668.387A2.18 2.18 0 0 0 2.25 8.706v3.788c0 .642.288 1.232.75 1.65" /></svg>`,
    scale: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" /></svg>`,
    swap: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>`,
    bank: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" /></svg>`,
    receipt: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185Z" /></svg>`,
    tag: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6Z" /></svg>`,
    currency: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
    users: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>`,
    server: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z" /></svg>`,
    cog: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a7.07 7.07 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>`
  };

  // 말단 메뉴 → 탭 오픈 헬퍼
  /** @param {string} id @param {string} label @param {any} component */
  const menuTab = (id, label, component) => ({
    label,
    href: '#',
    onClick: () => tabStore.openTab({ id, label, component })
  });

  // ── GNB (대분류). 시스템 관리는 ADMIN 역할에서만 노출
  let currentGnbId = $state('dashboard');

  const gnbItems = $derived(
    [
      { id: 'dashboard', label: '대시보드' },
      { id: 'portfolio', label: '포트폴리오' },
      { id: 'rebalancing', label: '리밸런싱' },
      { id: 'trade', label: '거래·계좌' },
      { id: 'master', label: '기준정보' },
      ...(isAdmin ? [{ id: 'system', label: '시스템 관리' }] : [])
    ].map((g) => ({
      ...g,
      href: '#',
      onClick: () => (currentGnbId = g.id),
      isActive: currentGnbId === g.id
    }))
  );

  // ── LNB (중분류 → 메뉴)
  const menuItemsMap = {
    dashboard: [
      { label: '종합 현황', icon: ICON.chart, children: [menuTab('asset-dashboard', '자산 종합 대시보드', AssetDashboard)] },
      { label: '보유 현황', icon: ICON.wallet, children: [
        menuTab('positions', '보유 포지션 현황', PositionList),
        menuTab('cash-balances', '현금 잔고 현황', CashBalanceList)
      ] }
    ],
    portfolio: [
      { label: '포트폴리오 관리', icon: ICON.briefcase, children: [
        menuTab('portfolios', '포트폴리오 관리', PortfolioManagement),
        menuTab('target-weights', '목표비율 관리', TargetWeightManagement)
      ] },
      { label: '평가', icon: ICON.chart, children: [menuTab('valuation', '포트폴리오 평가', PortfolioValuation)] }
    ],
    rebalancing: [
      { label: '리밸런싱 관리', icon: ICON.scale, children: [menuTab('rebalancing-runs', '리밸런싱 실행 이력', RebalancingRunList)] }
    ],
    trade: [
      { label: '계좌 관리', icon: ICON.bank, children: [menuTab('accounts', '계좌 관리', AccountManagement)] },
      { label: '거래 관리', icon: ICON.receipt, children: [menuTab('transactions', '거래 내역', TransactionList)] }
    ],
    master: [
      { label: '종목', icon: ICON.tag, children: [menuTab('stocks', '종목 관리', StockManagement)] },
      { label: '환율', icon: ICON.currency, children: [menuTab('exchange-rates', '환율 조회', ExchangeRateList)] }
    ],
    system: [
      { label: '사용자', icon: ICON.users, children: [
        menuTab('users', '사용자 관리', UserManagement),
        menuTab('my-profile', '내 정보', MyProfile)
      ] },
      { label: '데이터 수집 현황', icon: ICON.server, children: [menuTab('data-collection', '시세/환율 수집 현황', DataCollectionStatus)] },
      { label: '환경설정', icon: ICON.cog, children: [menuTab('common-codes', '공통 코드 관리', CommonCodeManagement)] }
    ]
  };

  const menuItems = $derived(menuItemsMap[/** @type {keyof typeof menuItemsMap} */ (currentGnbId)] ?? []);

  function handleLogout() {
    authStore.set({ isAuthenticated: false, token: null, user: null });
    goto('/login');
  }

  onMount(() => {
    if (!$authStore.isAuthenticated) {
      goto('/login');
      return;
    }
    if ($tabStore.tabs.length === 0) {
      tabStore.openTab({ id: 'asset-dashboard', label: '자산 종합 대시보드', component: AssetDashboard });
    }
  });
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <Header {user} {gnbItems} onLogout={handleLogout} />

  <div class="flex flex-1 overflow-hidden">
    <NavMenu items={menuItems} />

    <main class="flex-1 flex flex-col overflow-hidden w-0">
      <TabBar />

      <div class="flex-1 overflow-y-auto p-0 relative">
        {#each $tabStore.tabs as tab (tab.id)}
          {@const Component = tab.component}
          <div class={$tabStore.activeTabId === tab.id ? 'block' : 'hidden'}>
            <Component {...tab.props} />
          </div>
        {/each}

        {#if $tabStore.tabs.length === 0}
          <div class="flex items-center justify-center h-full text-gray-400">
            메뉴를 선택해 탭을 여세요
          </div>
        {/if}
      </div>

      <Footer companyName={appInfo.companyName} version={appInfo.version} />
    </main>
  </div>
</div>
