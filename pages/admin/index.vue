<script setup>
definePageMeta({
  layout: 'admin'
})

import { ref, onMounted, onUnmounted } from 'vue'

const data = ref({ total: 0, orders: 0 })
const bestSeller = ref(null)
const orders = ref([])
const topCustomers = ref([])
const frequentCustomers = ref([])
const showOrderModal = ref(false)
const selectedOrder = ref(null)
let interval

/* =========================
   LOAD DASHBOARD
========================= */
const load = async () => {
  try {
    const res = await $fetch('/api/dashboard')

    data.value = {
      total: res.total || 0,
      orders: res.orders || 0
    }

    bestSeller.value = res.bestSeller || null
    orders.value = res.latestOrders || []

    // 🔥 เพิ่มตรงนี้
    topCustomers.value = res.topCustomers || []
    frequentCustomers.value = res.frequentCustomers || []

  } catch (err) {
    console.error('dashboard error:', err)
  }
}
const openOrder = async (id) => {
  try {
    const res = await $fetch(`/api/order/${id}`)
    selectedOrder.value = res
    showOrderModal.value = true
    console.log('ORDER DETAIL:', res) // 🔥 ดูของจริง
  } catch (err) {
    console.error(err)
    alert('โหลดออเดอร์ไม่สำเร็จ')
  }
}

const formatDate = (date) => {
  if (!date) return '-'

  return new Date(date).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const lowStock = ref([])

const loadLowStock = async () => {
  lowStock.value = await $fetch('/api/admin/products/low-stock')
}

onMounted(() => {
  loadLowStock()
})
/* =========================
   LIFECYCLE
========================= */
onMounted(() => {
  load()
  interval = setInterval(load, 3000) // realtime
})

onUnmounted(() => {
  clearInterval(interval)
})
</script>

<template>
  <div class="p-6 space-y-6">

    <!-- TITLE -->
    <h1 class="text-2xl font-bold">
      📊 Admin Dashboard
    </h1>
    <div v-if="lowStock.length"
  class="bg-red-50 border border-red-200 rounded-xl p-4 shadow">

  <div class="flex justify-between items-center mb-2">
    <h2 class="font-bold text-red-600">
      ⚠️ สินค้าใกล้หมด ({{ lowStock.length }})
    </h2>

    <button @click="loadLowStock"
      class="text-xs text-gray-500 hover:text-black">
      รีเฟรช
    </button>
  </div>

  <div class="space-y-2 max-h-40 overflow-auto">
    <div v-for="p in lowStock" :key="p.id"
      class="flex justify-between bg-white p-2 rounded border">

      <span>{{ p.name }}</span>

      <span 
        :class="[
          'font-bold',
          p.stock === 0 ? 'text-red-600' : 'text-orange-500'
        ]"
      >
        {{ p.stock }} ชิ้น
      </span>

    </div>
  </div>
</div>
    <!-- KPI -->
    <div class="grid grid-cols-3 gap-4">

      <!-- SALES -->
      <div class="bg-green-100 p-4 rounded shadow">
        💰 ยอดขายวันนี้
        <div class="text-2xl font-bold">
          {{ data.total }} ฿
        </div>
      </div>

      <!-- ORDERS -->
      <div class="bg-blue-100 p-4 rounded shadow">
        📦 ออเดอร์
        <div class="text-2xl font-bold">
          {{ data.orders }}
        </div>
      </div>

      <!-- BEST SELLER -->
      <div class="bg-yellow-100 p-4 rounded shadow">
        🔥 สินค้าขายดี
        <div class="text-lg font-bold">
          {{ bestSeller?.name || '-' }}
        </div>
      </div>

    </div>

    <!-- 🔥 TOP SPENDER -->
    <div class="bg-white p-4 rounded shadow">

      <h2 class="font-bold mb-3">🏆 ลูกค้า VIP (Top Spender)</h2>

      <table class="w-full text-left">
        <thead>
          <tr class="border-b">
            <th>#</th>
            <th>ชื่อ</th>
            <th>ยอดซื้อ</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(c, i) in topCustomers" :key="i" class="border-b">

            <td class="p-2">
              {{ i + 1 }}
              <span v-if="i === 0">🥇</span>
              <span v-else-if="i === 1">🥈</span>
              <span v-else-if="i === 2">🥉</span>
            </td>
            <td>
            {{ c.name }}
            <span v-if="i === 0" class="text-yellow-500">VIP</span>
            </td>
            <td class="p-2 text-green-600 font-bold">
              {{ c.total_spent }} ฿
            </td>

          </tr>
        </tbody>
      </table>

    </div>

    <!-- 🔥 FREQUENT -->
    <div class="bg-white p-4 rounded shadow">

      <h2 class="font-bold mb-3">🔥 ลูกค้าซื้อบ่อย</h2>

      <table class="w-full text-left">
        <thead>
          <tr class="border-b">
            <th>#</th>
            <th>ชื่อ</th>
            <th>จำนวนครั้ง</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(c, i) in frequentCustomers" :key="i" class="border-b">

            <td class="p-2">{{ i + 1 }}</td>
            <td class="p-2">{{ c.name }}</td>

            <td class="p-2 text-blue-600 font-bold">
              {{ c.total_orders }}
            </td>

          </tr>
        </tbody>
      </table>

    </div>

    <!-- ORDERS -->
    <div class="bg-white p-4 rounded shadow">

      <h2 class="font-bold mb-3">🧾 รายการออเดอร์ล่าสุด</h2>

      <table class="w-full text-left">

        <thead>
          <tr class="border-b">
            <th class="p-2">ID</th>
            <th class="p-2">สินค้า</th>
            <th class="p-2">ยอด</th>
            <th class="p-2">สถานะ</th>
          </tr>
        </thead>

       <tbody>
        <tr
            v-for="o in orders"
            :key="o.id"
            class="border-b cursor-pointer hover:bg-gray-100"
            @click="openOrder(o.id)"
        >

            <!-- ID -->
            <td class="p-2">{{ o.id }}</td>

            <!-- ITEMS -->
            <td class="p-2 text-sm truncate max-w-[200px]">
            {{ o.items || '-' }}
            </td>

            <!-- AMOUNT -->
            <td class="p-2">{{ o.amount }} ฿</td>

            <!-- STATUS -->
            <td class="p-2">
            <span :class="o.status === 'paid'
                ? 'text-green-600'
                : 'text-yellow-600'">
                {{ o.status }}
            </span>
            </td>

        </tr>
        </tbody>

      </table>

    </div>
    <!-- ================= ORDER MODAL ================= -->
<div v-if="showOrderModal && selectedOrder"
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

  <div class="bg-white w-[400px] p-4 rounded shadow">

    <h2 class="text-xl font-bold mb-2">
      🧾 Order #{{ selectedOrder.id }}
    </h2>
    <div class="text-sm text-gray-500 mb-2">
    🕒 เวลา: {{ formatDate(selectedOrder.created_at) }}
    </div>
    <div class="text-sm text-gray-500 mb-2">
      สถานะ:
      <span :class="selectedOrder.status === 'paid'
        ? 'text-green-600'
        : 'text-yellow-600'">
        {{ selectedOrder.status }}
      </span>
    </div>

    <!-- ITEMS -->
    <div class="border-t pt-2">

    <div
    v-for="i in selectedOrder.items || []"
    :key="i.name"
    class="flex justify-between text-sm py-1"
    >
    <span>{{ i.name }} x{{ i.qty }}</span>
    <span>{{ i.price * i.qty }} ฿</span>
    </div>

    </div>

    <!-- TOTAL -->
    <div class="border-t mt-2 pt-2 font-bold text-right">
      รวม {{ selectedOrder.amount }} ฿
    </div>

    <!-- MEMBER -->
    <div v-if="selectedOrder.customer_name" class="mt-2 text-sm">
      👤 {{ selectedOrder.customer_name }}
    </div>

    <!-- POINT -->
    <div v-if="selectedOrder.points" class="text-sm text-blue-600">
      ⭐ ได้แต้ม {{ selectedOrder.points }}
    </div>

    <!-- CLOSE -->
    <button
      @click="showOrderModal = false"
      class="bg-red-500 text-white w-full mt-3 p-2 rounded"
    >
      ปิด
    </button>

  </div>
</div>

  </div>
</template>