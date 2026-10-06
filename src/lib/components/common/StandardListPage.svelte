<script>
  /**
   * 단위 프로그램 표준 골격 (목록 기본형)
   * - 상단: 검색 필터 영역 (filters 스니펫)
   * - 중단: 액션 버튼바 (actions 배열)
   * - 하단: tui-grid 목록 (+ 목록 아래 합계 등 footer 스니펫)
   * - 등록/수정 모달 등 부가 UI는 children 스니펫으로 주입
   *
   * 사용 규약(프로젝트 표준): 목록이 기본, 등록/수정은 팝업(Modal),
   * 화면 고유 동작은 actions 버튼으로 추가한다.
   */
  import { onMount, onDestroy } from 'svelte';
  import 'tui-grid/dist/tui-grid.css';
  import UiButton from '$lib/components/controls/Button.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';

  let {
    title = '',
    columns = [],
    data = [],
    /** @type {Array<{label:string,color?:string,iconType?:string,onClick?:() => void}>} */
    actions = [],
    filters = undefined,        // 검색 필터 영역 스니펫
    footer = undefined,         // 목록 아래 영역 스니펫 (합계 등)
    summary = undefined,        // tui-grid summary 옵션 (그리드 하단 합계 행)
    treeColumnOptions = undefined, // tui-grid 트리 옵션 (행의 _children 으로 하위 행 표시)
    rowHeaders = ['rowNum', 'checkbox'], // tui-grid 행 헤더 (체크박스가 필요 없는 조회 화면은 ['rowNum'])
    children = undefined,       // 모달 등 부가 UI 스니펫
    onReady = () => {},          // (grid) => void
    onRowDblClick = () => {}     // (rowData, grid) => void
  } = $props();

  /** @type {HTMLElement} */
  let gridContainer;
  /** @type {any} */
  let grid;
  /** @type {ResizeObserver | undefined} */
  let resizeObserver;

  onMount(async () => {
    const { default: Grid } = await import('tui-grid');

    grid = new Grid({
      el: gridContainer,
      data,
      scrollX: true,
      scrollY: true,
      bodyHeight: 'fitToParent',
      columns,
      rowHeaders,
      columnOptions: { resizable: true },
      ...(summary ? { summary } : {}),
      ...(treeColumnOptions ? { treeColumnOptions } : {})
    });

    setTimeout(() => grid.refreshLayout(), 100);
    // 숨김 탭(display:none)에서 데이터를 받으면 너비 0으로 그려진다 — 다시 보일 때(크기 변화) 레이아웃을 다시 계산
    // 창 크기 변경도 컨테이너 크기 변화로 함께 잡힌다
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(gridContainer);

    grid.on('dblclick', (ev) => {
      if (ev.rowKey !== undefined) {
        onRowDblClick(grid.getRow(ev.rowKey), grid);
      }
    });

    onReady(grid);
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
    if (grid) grid.destroy();
  });

  function handleResize() {
    // 숨김 상태(크기 0)에서는 계산하지 않는다
    if (grid && gridContainer.offsetWidth > 0) grid.refreshLayout();
  }
</script>

<div class="absolute inset-0 flex flex-col p-4">
  {#if filters}
    <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-3">
      {@render filters()}
    </div>
  {/if}

  <div class="flex items-center mb-3 justify-between">
    <h2 class="text-sm font-semibold text-gray-700">{title}</h2>
    <div class="flex gap-2">
      {#each actions as a}
        <UiButton
          label={a.label}
          color={a.color || BUTTON_COLORS.INDIGO}
          iconType={a.iconType || ''}
          onclick={a.onClick || (() => {})}
        />
      {/each}
    </div>
  </div>

  <div class="flex-1 bg-white rounded-lg shadow overflow-hidden relative">
    <div bind:this={gridContainer} class="h-full"></div>
  </div>

  {#if footer}
    <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mt-3">
      {@render footer()}
    </div>
  {/if}
</div>

{@render children?.()}
