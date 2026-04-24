<script setup>
definePageMeta({
  layout: 'admin'
})
import { ref, watch } from 'vue'

const page = ref(1)
const limit = 10

const search = ref('')
const from = ref('')
const to = ref('')

const selected = ref(null)

const fetchOrders = async () => {
  return await $fetch('/api/admin/orders', {
    query: {
      page: page.value,
      limit,
      search: search.value,
      from: from.value,
      to: to.value
    }
  })
}

const { data, refresh } = await useAsyncData('orders', fetchOrders, {
  watch: [page, search, from, to]
})

const loadingId = ref(null)

const open = async (id) => {
  try {
    loadingId.value = id
    selected.value = null
    selected.value = await $fetch(`/api/admin/orders/${id}`)
  } finally {
    loadingId.value = null
  }
}
const totalPages = computed(() =>
  Math.ceil((data.value?.total || 0) / limit)
)
</script>

<template>
  <div class="p-6 space-y-6">

    <h1 class="text-2xl font-bold">🧾 Orders</h1>

    <!-- 🔍 FILTER -->
    <div class="bg-white p-4 rounded-xl shadow flex flex-wrap gap-3 items-end">
      
      <input v-model="search"
        placeholder="ค้นหา Order ID / เบอร์"
        class="border p-2 rounded w-60"/>

      <div>
        <label class="text-xs text-gray-500">จาก</label>
        <input type="date" v-model="from" class="border p-2 rounded"/>
      </div>

      <div>
        <label class="text-xs text-gray-500">ถึง</label>
        <input type="date" v-model="to" class="border p-2 rounded"/>
      </div>

      <button @click="refresh()"
        class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
        ค้นหา
      </button>

    </div>

    <!-- TABLE -->
    <div class="bg-white rounded-xl shadow overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-100 text-gray-600">
          <tr>
            <th class="p-3 text-left">#</th>
            <th>ลูกค้า</th>
            <th>ยอด</th>
            <th>สุทธิ</th>
            <th>จ่าย</th>
            <th>เวลา</th>
          </tr>
        </thead>

        <tbody>
  <!-- 🔄 Loading -->
  <tr v-if="loading" v-for="n in 5" :key="n">
    <td colspan="6" class="p-3">
      <div class="h-4 bg-gray-200 animate-pulse rounded"></div>
    </td>
  </tr>

  <!-- 📦 Data -->
  <tr v-for="o in data?.data" :key="o.id"
      class="border-t hover:bg-indigo-50 cursor-pointer transition"
      @click="open(o.id)"
  >
    <td class="p-3 font-bold flex items-center gap-2">
      <span v-if="loadingId === o.id" class="animate-spin">⏳</span>
      <span v-else>#{{ o.id }}</span>
    </td>
      
    <td>
      <div>{{ o.customer_name || '-' }}</div>
      <div class="text-xs text-gray-400">{{ o.customer_phone }}</div>
    </td>

    <td>฿{{ o.total }}</td>
    <td class="font-bold text-indigo-600">฿{{ o.amount }}</td>

    <td>
      <span v-if="o.payment_method==='cash'" class="text-green-600">💵 Cash</span>
      <span v-else class="text-blue-600">📱 QR</span>
    </td>

    <td class="text-xs text-gray-500">
      {{ new Date(o.created_at).toLocaleString('th-TH') }}
    </td>
  </tr>

  <!-- ❌ Empty -->
  <tr v-if="!loading && data?.data?.length === 0">
    <td colspan="6" class="text-center p-6 text-gray-400">
      ไม่พบข้อมูล
    </td>
  </tr>
</tbody>
      </table>
    </div>

    <!-- 🔄 PAGINATION -->
    <div class="flex justify-center gap-2">
      <button @click="page--" :disabled="page===1"
        class="px-3 py-1 border rounded">Prev</button>

      <span class="px-3 py-1">หน้า {{ page }} / {{ totalPages }}</span>

      <button @click="page++" :disabled="page===totalPages"
        class="px-3 py-1 border rounded">Next</button>
    </div>

    <!-- 🧾 RECEIPT MODAL -->
    <div v-if="selected"
      class="fixed inset-0 bg-black/50 flex items-center justify-center">

      <div class="bg-white p-6 rounded-xl w-96 relative">
        <button @click="selected=null"
          class="absolute right-2 top-2 text-gray-400">✕</button>

        <h2 class="text-lg font-bold mb-3">ใบเสร็จ #{{ selected.order.id }}</h2>

        <div v-for="i in selected.items" :key="i.id"
          class="flex justify-between text-sm">
          <span>{{ i.name }} x{{ i.qty }}</span>
          <span>฿{{ i.price * i.qty }}</span>
        </div>

        <hr class="my-3">

        <div class="flex justify-between">
          <span>รวม</span>
          <span>{{ selected.order.total }}</span>
        </div>

        <div class="flex justify-between text-red-500">
          <span>ส่วนลด</span>
          <span>-{{ selected.order.discount }}</span>
        </div>

        <div class="flex justify-between font-bold text-lg">
          <span>สุทธิ</span>
          <span>{{ selected.order.amount }}</span>
        </div>

      </div>
    </div>

  </div>
</template>