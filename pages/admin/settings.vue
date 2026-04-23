<script setup>
definePageMeta({ layout: 'admin' })

const config = ref({
  promptpay_id: '',
  point_rate: 100,
  point_value: 1,
  categories: ''
})

const load = async () => {
  const res = await $fetch('/api/admin/settings')
  config.value = res
}

const save = async () => {
  await $fetch('/api/admin/settings', {
    method: 'POST',
    body: config.value
  })
  alert('บันทึกสำเร็จ')
}


onMounted(load)
</script>

<template>
  <div class="p-6 max-w-2xl space-y-6">

    <h1 class="text-2xl font-bold">⚙️ ตั้งค่าระบบ</h1>

    <!-- PromptPay -->
    <div class="bg-white p-4 rounded shadow">
      <h2 class="font-bold mb-2">💳 PromptPay</h2>
      <input v-model="config.promptpay_id"
        class="border p-2 w-full rounded"
        placeholder="เบอร์ / เลขบัญชี" />
    </div>

    <!-- Points -->
    <div class="bg-white p-4 rounded shadow space-y-2">
      <h2 class="font-bold">🎁 ระบบแต้ม</h2>

      <div>
        <label>กี่บาท = 1 แต้ม</label>
        <input v-model.number="config.point_rate"
          type="number" class="border p-2 w-full rounded" />
      </div>

      <div>
        <label>1 แต้ม = กี่บาท</label>
        <input v-model.number="config.point_value"
          type="number" class="border p-2 w-full rounded" />
      </div>
    </div>

    <!-- Categories -->
    <div class="bg-white p-4 rounded shadow">
      <h2 class="font-bold mb-2">📦 หมวดหมู่สินค้า</h2>

      <textarea v-model="config.categories"
        class="border p-2 w-full rounded"
        placeholder="คั่นด้วย , เช่น กาแฟ,ชา,ของหวาน"></textarea>
    </div>


    <!-- SAVE -->
    <button @click="save"
      class="bg-blue-600 text-white px-6 py-2 rounded">
      💾 บันทึก
    </button>

  </div>
</template>