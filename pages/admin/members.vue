<script setup>
definePageMeta({
  layout: 'admin'
})

import { ref, onMounted } from 'vue'

const members = ref([])
const showModal = ref(false)
const editMode = ref(false)

const form = ref({
  id: null,
  name: '',
  phone: '',
  points: 100
})

/* ================= LOAD ================= */
const load = async () => {
  members.value = await $fetch('/api/admin/customers')
}

/* ================= OPEN ADD ================= */
const openAdd = () => {
  editMode.value = false
  form.value = {
    id: null,
    name: '',
    phone: '',
    points: 100
  }
  showModal.value = true
}

/* ================= OPEN EDIT ================= */
const openEdit = (m) => {
  editMode.value = true
  form.value = { ...m }
  showModal.value = true
}

/* ================= SAVE ================= */
const saveMember = async () => {
  if (!form.value.name || !form.value.phone) {
    alert('กรอกข้อมูลให้ครบ')
    return
  }

  await $fetch('/api/admin/customer.save', {
    method: 'POST',
    body: form.value
  })

  showModal.value = false
  await load()
}

/* ================= UPDATE POINT INLINE ================= */
const updatePoints = async (m) => {
  await $fetch('/api/admin/customer.update', {
    method: 'POST',
    body: {
      id: m.id,
      points: m.points
    }
  })

  alert('อัปเดตแล้ว')
}

/* ================= DELETE ================= */
const remove = async (m) => {
  if (!confirm('ลบสมาชิก?')) return

  await $fetch('/api/admin/customer.delete', {
    method: 'POST',
    body: { id: m.id }
  })

  await load()
}

onMounted(load)
</script>

<template>
  <div class="p-6">

    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">👤 Members</h1>

      <button
        @click="openAdd"
        class="bg-blue-600 text-white px-4 py-2 rounded">
        ➕ เพิ่มสมาชิก
      </button>
    </div>

    <!-- TABLE -->
    <table class="w-full mt-4 border text-center">

      <!-- HEADER -->
      <thead>
        <tr class="bg-gray-200">
          <th>ชื่อ</th>
          <th>เบอร์</th>
          <th>คะแนน</th>
          <th>ข้อมูล</th>
          <th>Action</th>
        </tr>
      </thead>

      <!-- BODY -->
      <tbody>
        <tr v-for="m in members" :key="m.id">

          <!-- NAME -->
          <td>{{ m.name }}</td>

          <!-- PHONE -->
          <td>{{ m.phone }}</td>

          <!-- POINTS -->
          <td>
            <input
              v-model.number="m.points"
              class="border w-24 text-center" />
          </td>

          <!-- INFO -->
          <td>
            <div>
              <span v-if="m.rank === 1">🥇</span>
              <span v-else-if="m.rank === 2">🥈</span>
              <span v-else-if="m.rank === 3">🥉</span>
            </div>

            <div class="text-xs text-gray-500">
              💰 {{ m.total_spent }} ฿
            </div>
          </td>

          <!-- ACTION -->
          <td class="space-x-2">

            <button
              @click="updatePoints(m)"
              class="bg-green-500 text-white px-2 py-1">
              💾 save
            </button>

            <button
              @click="openEdit(m)"
              class="bg-yellow-500 text-white px-2 py-1">
              ✏️ edit
            </button>

            <button
              @click="remove(m)"
              class="bg-red-500 text-white px-2 py-1">
              🗑 delete
            </button>

          </td>

        </tr>
      </tbody>

    </table>

    <!-- MODAL -->
    <div v-if="showModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center">

      <div class="bg-white p-6 rounded w-96">

        <h2 class="text-xl font-bold mb-3">
          {{ editMode ? 'แก้ไขสมาชิก' : 'เพิ่มสมาชิก' }}
        </h2>

        <input
          v-model="form.name"
          placeholder="ชื่อ"
          class="border p-2 w-full mb-2" />

        <input
          v-model="form.phone"
          placeholder="เบอร์โทร"
          class="border p-2 w-full mb-2" />

        <input
          v-model.number="form.points"
          type="number"
          class="border p-2 w-full mb-2"
          placeholder="คะแนน" />

        <div class="flex justify-end gap-2 mt-3">

          <button
            @click="showModal = false"
            class="bg-gray-400 text-white px-3 py-1">
            ยกเลิก
          </button>

          <button
            @click="saveMember"
            class="bg-green-600 text-white px-3 py-1">
            บันทึก
          </button>

        </div>

      </div>
    </div>

  </div>
</template>