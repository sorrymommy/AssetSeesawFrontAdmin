<script>
  import UiButton from '$lib/components/controls/Button.svelte';
  import { BUTTON_COLORS } from '$lib/constants.js';

  let {
    isOpen = $bindable(false),
    memberData = $bindable({}),
    onSave = () => {}
  } = $props();

  let localData = $state({
    name: '',
    email: '',
    role: 'User',
    status: 'Active'
  });

  $effect(() => {
    if (isOpen) {
      if (memberData && Object.keys(memberData).length > 0) {
        localData = { ...memberData };
      } else {
        // Reset to defaults for Add mode
        localData = {
          name: '',
          email: '',
          role: 'User',
          status: 'Active'
        };
      }
    }
  });

  function handleClose() {
    isOpen = false;
  }

  function handleSave() {
    onSave(localData);
    isOpen = false;
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 class="text-lg font-semibold text-gray-800">Member Details</h3>
        <button onclick={handleClose} class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-4">
        <div>
          <label for="modal-name" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            id="modal-name"
            bind:value={localData.name}
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
          >
        </div>

        <div>
          <label for="modal-email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            id="modal-email"
            bind:value={localData.email}
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
          >
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="modal-role" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              id="modal-role"
              bind:value={localData.role}
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
            >
              <option value="Administrator">Administrator</option>
              <option value="Manager">Manager</option>
              <option value="User">User</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          <div>
            <label for="modal-status" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              id="modal-status"
              bind:value={localData.status}
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
        <UiButton label="Cancel" color={BUTTON_COLORS.GRAY} onclick={handleClose} />
        <UiButton label="Save" color={BUTTON_COLORS.INDIGO} onclick={handleSave} />
      </div>
    </div>
  </div>
{/if}
