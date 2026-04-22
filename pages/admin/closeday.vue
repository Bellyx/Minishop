<script setup>
definePageMeta({ layout: 'admin' })
const report = ref(null)

const load = async () => {
  report.value = await $fetch('/api/report/today')
}

const closeDay = async () => {
  try {
    await $fetch('/api/report/close-day', { method: 'POST' })
    alert('ปิดยอดแล้ว')
    load()
  } catch (e) {
    alert(e.data?.message)
  }
}

const print = async () => {
  const res = await $fetch('/api/report/print')
  window.open(res.url)
}

const exportReport = async () => {
  const res = await $fetch('/api/report/export', {
    method: 'POST',
    body: {
      date: new Date().toISOString().slice(0, 10)
    }
  })

  window.open(res.url, '_blank')
}

onMounted(load)
</script>

<template>
  <div class="p-6 bg-white rounded shadow">

    <h1 class="text-xl font-bold mb-4">📊 ปิดยอดสิ้นวัน</h1>

    <div v-if="report">
      <p>ยอดขาย: {{ report.total_sales }}</p>
      <p>บิล: {{ report.total_orders }}</p>
      <p>กำไร: {{ report.total_profit }}</p>
      <p>เงินสด: {{ report.cash_total }}</p>
      <p>PromptPay: {{ report.promptpay_total }}</p>
    </div>

    <div class="flex gap-2 mt-4">
      <button @click="closeDay"
        class="bg-red-500 text-white px-4 py-2 rounded">
        🔒 ปิดยอด
      </button>

     <button @click="exportReport" class="bg-green-600 text-white px-4 py-2 rounded"> 📊 ปิดยอด (Export Excel) </button>
    </div>

  </div>
</template>