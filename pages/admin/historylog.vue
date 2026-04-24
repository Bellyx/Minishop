<script setup>
definePageMeta({ layout: 'admin' })

const logs = ref([])
const loading = ref(false)

const filterType = ref('')
const search = ref('')

const loadLogs = async () => {
  loading.value = true
  try {
    logs.value = await $fetch('/api/admin/stock-logs', {
      query: {
        type: filterType.value,
        product: search.value
      }
    })
  } finally {
    loading.value = false
  }
}

watch([filterType, search], loadLogs)

onMounted(loadLogs)
</script>
<template>
<div class="p-6 space-y-6 bg-gray-50 min-h-screen">

  <!-- HEADER -->
  <div class="flex justify-between items-center">
    <h1 class="text-2xl font-bold">📊 Stock History</h1>

    <button @click="loadLogs"
      class="bg-indigo-500 text-white px-4 py-2 rounded">
      รีเฟรช
    </button>
  </div>

  <!-- FILTER -->
  <div class="bg-white p-4 rounded-xl shadow flex gap-3 items-center flex-wrap">

    <input v-model="search"
      placeholder="ค้นหาสินค้า..."
      class="border p-2 rounded w-60" />

    <select v-model="filterType"
      class="border p-2 rounded">
      <option value="">ทั้งหมด</option>
      <option value="in">➕ เติม</option>
      <option value="out">➖ ขาย</option>
      <option value="adjust">⚙️ ปรับ</option>
    </select>

  </div>

  <!-- LOADING -->
  <div v-if="loading" class="text-center py-10 text-gray-400">
    ⏳ กำลังโหลด...
  </div>

  <!-- LOG LIST -->
  <div v-else class="space-y-3">

    <div v-for="l in logs" :key="l.id"
      class="bg-white p-4 rounded-xl shadow flex justify-between items-center hover:shadow-md transition">

      <!-- LEFT -->
      <div class="flex items-center gap-3">

        <!-- ICON -->
        <div
          :class="[
            'w-10 h-10 flex items-center justify-center rounded-full text-white',
            l.type === 'in' ? 'bg-green-500' :
            l.type === 'out' ? 'bg-red-500' :
            'bg-gray-500'
          ]"
        >
          <span v-if="l.type==='in'">⬆️</span>
          <span v-else-if="l.type==='out'">⬇️</span>
          <span v-else>⚙️</span>
        </div>

        <!-- INFO -->
        <div>
          <div class="font-bold text-gray-800">
            {{ l.product_name }}
          </div>

          <div class="text-sm text-gray-500">
            {{ l.note || '-' }}
          </div>

          <div class="text-xs text-gray-400">
            {{ new Date(l.created_at).toLocaleString('th-TH') }}
          </div>
          <div class="text-xs text-gray-400">
            โดย: {{ l.created_by || 'system' }}
            </div>
        </div>
      </div>


      <!-- RIGHT -->
      <div class="text-right">

        <div
          :class="[
            'font-bold text-lg',
            l.type === 'in' ? 'text-green-600' :
            l.type === 'out' ? 'text-red-600' :
            'text-gray-600'
          ]"
        >
          {{ l.type === 'out' ? '-' : '+' }}{{ l.qty }}
        </div>

        <div class="text-xs text-gray-400">
          {{ l.before_qty }} → {{ l.after_qty }}
        </div>

      </div>

    </div>

  </div>

</div>
</template>