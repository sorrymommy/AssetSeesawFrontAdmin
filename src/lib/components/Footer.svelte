<script>
  /**
   * @type {{ companyName: string, version: string, copyrightYear?: number }}
   */
  let {
    companyName = 'Acme Corp',
    version = 'v1.0.0',
    copyrightYear = new Date().getFullYear()
  } = $props();
</script>

<footer class="bg-white border-t border-gray-200 py-5 px-8">
  <div class="flex flex-col items-center justify-center text-sm text-gray-500">
    <div class="text-center">
      <p>&copy; {copyrightYear} <span class="font-semibold text-gray-700">{companyName}</span>. All rights reserved.</p>
    </div>
  </div>
</footer>
