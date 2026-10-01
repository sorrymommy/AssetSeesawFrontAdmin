<script>
  import Button from '$lib/components/Button.svelte';
</script>

<div class="max-w-4xl mx-auto p-6">
  <h1 class="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
  <p class="text-gray-600 mb-8">Welcome to the main dashboard overview.</p>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 class="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
      <p class="text-2xl font-bold text-gray-900">1,234</p>
    </div>
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 class="text-sm font-medium text-gray-500 mb-2">Active Sessions</h3>
      <p class="text-2xl font-bold text-gray-900">567</p>
    </div>
    <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 class="text-sm font-medium text-gray-500 mb-2">Revenue</h3>
      <p class="text-2xl font-bold text-gray-900">$12,345</p>
    </div>
  </div>

  <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <h2 class="text-lg font-semibold mb-4">Quick Actions</h2>
    <Button variant="primary" onclick={() => alert('Action triggered!')}>
      Generate Report
    </Button>
  </div>
</div>
