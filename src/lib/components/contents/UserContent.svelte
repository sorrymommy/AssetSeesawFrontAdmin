<script>
  import Button from '$lib/components/Button.svelte';
</script>

<div class="max-w-4xl mx-auto p-6">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold text-gray-900">User Management</h1>
    <Button variant="primary" onclick={() => alert('Add User')}>Add User</Button>
  </div>

  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <table class="w-full text-left text-sm">
      <thead class="bg-gray-50 border-b border-gray-100">
        <tr>
          <th class="px-6 py-4 font-medium text-gray-500">Name</th>
          <th class="px-6 py-4 font-medium text-gray-500">Email</th>
          <th class="px-6 py-4 font-medium text-gray-500">Role</th>
          <th class="px-6 py-4 font-medium text-gray-500">Status</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        {#each [1, 2, 3, 4, 5] as i}
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 font-medium text-gray-900">User {i}</td>
            <td class="px-6 py-4 text-gray-500">user{i}@example.com</td>
            <td class="px-6 py-4 text-gray-500">Editor</td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
