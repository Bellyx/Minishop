<script setup>
definePageMeta({ layout: 'admin' })

const report = ref(null)
const from = ref('')
const to = ref('')

const load = async () => {
  report.value = await $fetch('/api/admin/report', {
    query: { from: from.value, to: to.value }
  })
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
const exportExcel = () => {
  window.open('/api/admin/report.export')
}

onMounted(load)
</script>

<template>
<div class="p-6 space-y-6">

  <h1 class="text-2xl font-bold">📊 Sales Report</h1>

  <!-- FILTER -->
  <div class="flex gap-2">
    <input type="date" v-model="from" class="border p-2" />
    <input type="date" v-model="to" class="border p-2" />
    <button @click="load" class="bg-blue-500 text-white px-4">โหลด</button>
    <button @click="exportExcel" class="bg-green-500 text-white px-4">Export Excel</button>
  </div>

  <!-- SUMMARY -->
  <div class="grid grid-cols-3 gap-4">

    <div class="bg-green-100 p-4 rounded">
      💰 รายรับ
      <div class="text-xl font-bold">
        {{ report?.summary?.revenue || 0 }} ฿
      </div>
    </div>

    <div class="bg-red-100 p-4 rounded">
      💸 ต้นทุน
      <div class="text-xl font-bold">
        {{ report?.summary?.cost || 0 }} ฿
      </div>
    </div>

    <div class="bg-yellow-100 p-4 rounded">
      📈 กำไร
      <div class="text-xl font-bold">
        {{ report?.summary?.profit || 0 }} ฿
      </div>
    </div>

  </div>

  <!-- DAILY -->
  <div class="bg-white p-4 rounded shadow">
    <h2 class="font-bold mb-2">📅 รายวัน</h2>

    <table class="w-full">
      <tr class="border-b">
        <th>🕒วันที่เวลา:</th>
        <th>รายรับ</th>
        <th>ต้นทุน</th>
        <th>กำไร</th>
      </tr>

      <tr v-for="d in report?.daily" :key="d.date">
        <td>{{ formatDate(d.date) }}</td>
        <td>{{ d.revenue }}</td>
        <td>{{ d.cost }}</td>
        <td>{{ d.profit }}</td>
      </tr>
    </table>
  </div>

  <!-- PRODUCT -->
  <div class="bg-white p-4 rounded shadow">
    <h2 class="font-bold mb-2">📦 สินค้า</h2>

    <table class="w-full">
      <tr class="border-b">
        <th>ชื่อ</th>
        <th>จำนวน</th>
        <th>รายรับ</th>
        <th>ต้นทุน</th>
        <th>กำไร</th>
      </tr>

      <tr v-for="p in report?.products" :key="p.name">
        <td>{{ p.name }}</td>
        <td>{{ p.qty }}</td>
        <td>{{ p.revenue }}</td>
        <td>{{ p.cost }}</td>
        <td>{{ p.profit }}</td>
      </tr>
    </table>
  </div>

</div>
</template>