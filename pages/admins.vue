<script setup>
const orders = ref([])
const bestSeller = ref(null)
const todaySales = ref(0)

const load = async () => {
  const res = await $fetch('/api/admin/dashboard')

  orders.value = res.orders || []
  bestSeller.value = res.bestSeller || null
  todaySales.value = res.todaySales || 0
}

onMounted(load)
</script>

<template>
  <div class="p-6 space-y-6 bg-gray-50 min-h-screen">

    <h1 class="text-2xl font-bold">📊 Admin Dashboard</h1>

    <!-- KPI -->
    <div class="grid grid-cols-3 gap-4">

      <div class="bg-white shadow p-4 rounded-lg border-l-4 border-green-500">
        💰 ยอดขายวันนี้
        <div class="text-2xl font-bold text-green-600">
          {{ todaySales }}
        </div>
      </div>

      <div class="bg-white shadow p-4 rounded-lg border-l-4 border-blue-500">
        🔥 Best Seller
        <div class="text-lg font-semibold">
          {{ bestSeller?.name || '-' }}
        </div>
      </div>

      <div class="bg-white shadow p-4 rounded-lg border-l-4 border-yellow-500">
        📦 Orders
        <div class="text-2xl font-bold">
          {{ orders.length }}
        </div>
      </div>

    </div>

    <!-- Orders -->
    <div class="bg-white p-4 rounded-lg shadow">

      <h2 class="text-lg font-bold mb-3">📋 รายการออเดอร์</h2>

      <table class="w-full border-collapse">

        <thead>
          <tr class="bg-gray-100 text-left">
            <th class="p-2">ID</th>
            <th class="p-2">ยอด</th>
            <th class="p-2">สถานะ</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="o in orders"
            :key="o.id"
            class="border-t hover:bg-gray-50"
          >
            <td class="p-2">{{ o.id }}</td>
            <td class="p-2">{{ o.amount }}</td>
            <td class="p-2">
              <span
                class="px-2 py-1 rounded text-xs"
                :class="o.status === 'paid'
                  ? 'bg-green-200 text-green-800'
                  : 'bg-yellow-200 text-yellow-800'"
              >
                {{ o.status }}
              </span>
            </td>
          </tr>
        </tbody>

      </table>

    </div>

  </div>
</template>