<script>
  import { onMount, onDestroy } from 'svelte';
  import 'tui-grid/dist/tui-grid.css';
  import LookupComboBox from '$lib/components/controls/LookupComboBox.svelte';
  import UiButton from '$lib/components/controls/Button.svelte';
  import NumberInput from '$lib/components/controls/NumberInput.svelte';
  import MemberDetailModal from './MemberDetailModal.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';
  import { memberApi } from '$lib/api/memberApi';

  let gridContainer;
  let grid;
  let statusValue = $state('');
  let roleValue = $state('');
  let searchId = $state('');
  let isModalOpen = $state(false);
  let selectedMember = $state({});

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Suspended', label: 'Suspended' }
  ];

  const roleOptions = [
    { value: 'Administrator', label: 'Administrator' },
    { value: 'Manager', label: 'Manager' },
    { value: 'User', label: 'User' },
    { value: 'Viewer', label: 'Viewer' }
  ];

  const columns = [
    { header: 'Name', name: 'name', editor: 'text', sortable: true, filter: 'text' },
    { header: 'Email', name: 'email', editor: 'text', sortable: true, filter: 'text', minWidth: 200 },
    { header: 'Role', name: 'role', editor: 'text', sortable: true, filter: 'select' },
    { header: 'Status', name: 'status', editor: 'text', sortable: true, filter: 'select' },
    { header: 'Last Login', name: 'lastLogin', sortable: true }
  ];

  async function loadMembers() {
    try {
      const members = await memberApi.getMembers({
        id: searchId,
        status: statusValue,
        role: roleValue
      });

      if (grid) {
        grid.resetData(members);
      }
      return members;
    } catch (error) {
      console.error('Failed to load members:', error);
      alert('Failed to load members.');
      return [];
    }
  }

  onMount(async () => {
    const { default: Grid } = await import('tui-grid');

    grid = new Grid({
      el: gridContainer,
      data: [],
      scrollX: true,
      scrollY: true,
      bodyHeight: 'fitToParent',
      columns: columns,
      rowHeaders: ['rowNum', 'checkbox'],
      columnOptions: {
        resizable: true
      }
    });

    await loadMembers();

    setTimeout(() => {
      grid.refreshLayout();
    }, 100);

    // Resize grid when window resizes
    window.addEventListener('resize', handleResize);

    grid.on('dblclick', (ev) => {
      if (ev.rowKey !== undefined) {
        const rowData = grid.getRow(ev.rowKey);
        selectedMember = rowData;
        isModalOpen = true;
      }
    });
  });

  onDestroy(() => {
    if (grid) {
      grid.destroy();
    }
    window.removeEventListener('resize', handleResize);
  });

  function handleResize() {
    if (grid) {
      grid.refreshLayout();
    }
  }

  function handleAdd() {
    selectedMember = {};
    isModalOpen = true;
  }
</script>

<div class="absolute inset-0 flex flex-col p-4">

  <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-3">
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <div>
        <NumberInput id="search-id" label="Member ID" bind:value={searchId} placeholder="Search by ID" />
      </div>
      <div>
        <label for="search-name" class="block text-xs font-medium text-gray-700 mb-1">Name</label>
        <input type="text" id="search-name" class="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border" placeholder="Search by name">
      </div>
      <div>
        <label for="search-email" class="block text-xs font-medium text-gray-700 mb-1">Email</label>
        <input type="text" id="search-email" class="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border" placeholder="Search by email">
      </div>

      <LookupComboBox
        id="search-status"
        label="Status"
        options={statusOptions}
        bind:value={statusValue}
        placeholder="All Status"
      />

      <LookupComboBox
        id="search-role"
        label="Role"
        options={roleOptions}
        bind:value={roleValue}
        placeholder="All Roles"
      />
      <div>
        <label for="search-date" class="block text-xs font-medium text-gray-700 mb-1">Join Date</label>
        <input type="date" id="search-date" class="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border">
      </div>
      <div>
        <span class="block text-xs font-medium text-gray-700 mb-1">Options</span>
        <div class="flex items-center gap-3 h-[30px]">
          <label class="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5">
            <span class="text-xs text-gray-600">Deleted</span>
          </label>
          <label class="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5">
            <span class="text-xs text-gray-600">Locked</span>
          </label>
        </div>
      </div>
      <div>
        <span class="block text-xs font-medium text-gray-700 mb-1">Gender</span>
        <div class="flex items-center gap-3 h-[30px]">
          <label class="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="gender" class="border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5">
            <span class="text-xs text-gray-600">All</span>
          </label>
          <label class="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="gender" class="border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5">
            <span class="text-xs text-gray-600">M</span>
          </label>
          <label class="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="gender" class="border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5">
            <span class="text-xs text-gray-600">F</span>
          </label>
        </div>
      </div>
      <div class="col-span-1 sm:col-span-2">
        <label for="search-desc" class="block text-xs font-medium text-gray-700 mb-1">Description</label>
        <input type="text" id="search-desc" class="block w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border" placeholder="Search by description">
      </div>
    </div>
  </div>

  <div class="flex items-center mb-3 justify-end">
    <div class="flex gap-2">
      <UiButton label="Search" color={BUTTON_COLORS.INDIGO} iconType="search" onclick={loadMembers} />
      <UiButton label="Add" color={BUTTON_COLORS.EMERALD} iconType="add" onclick={handleAdd} />
      <UiButton label="Remove" color={BUTTON_COLORS.ROSE} iconType="remove" onclick={() => alert('Remove button clicked')} />
      <UiButton label="Save" color={BUTTON_COLORS.BLUE} iconType="save" onclick={() => alert('Save button clicked')} />
      <UiButton label="Import" color={BUTTON_COLORS.AMBER} iconType="import" onclick={() => alert('Import button clicked')} />
      <UiButton label="Export" color={BUTTON_COLORS.TEAL} iconType="export" onclick={() => alert('Export button clicked')} />
      <UiButton label="Print" color={BUTTON_COLORS.SLATE} iconType="print" onclick={() => alert('Print button clicked')} />
    </div>
  </div>

  <div class="flex-1 bg-white rounded-lg shadow overflow-hidden relative">
    <div bind:this={gridContainer} class="h-full"></div>
  </div>
</div>

<MemberDetailModal
  bind:isOpen={isModalOpen}
  bind:memberData={selectedMember}
  onSave={async (updatedData) => {
    try {
      if (updatedData.id) {
        await memberApi.updateMember(updatedData.id, updatedData);
        grid.setRow(updatedData.rowKey, updatedData);
        alert('Member updated successfully!');
      } else {
        const newMember = await memberApi.createMember(updatedData);
        grid.appendRow(newMember);
        alert('Member created successfully!');
      }
    } catch (error) {
      console.error('Failed to save member:', error);
      alert('Failed to save member.');
    }
  }}
/>
