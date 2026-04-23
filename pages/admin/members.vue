<script setup>
definePageMeta({
  layout: 'admin'
})

import { ref, onMounted } from 'vue'

const members = ref([])
const showModal = ref(false)
const editMode = ref(false)
const loading = ref(false)
const isSaving = ref(false) // State สำหรับปุ่มบันทึก
const updatingId = ref(null) // State สำหรับระบุ ID ที่กำลังอัปเดตคะแนนอยู่

// State สำหรับ Toast
const toasts = ref([])

// State สำหรับ Confirm Modal
const showConfirm = ref(false)
const memberToDelete = ref(null)

const form = ref({
  id: null,
  name: '',
  phone: '',
  points: 100
})

/* ================= TOAST SYSTEM ================= */
const showToast = (message, type = 'success') => {
  const id = Date.now()
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3000)
}

/* ================= LOAD ================= */
const load = async () => {
  loading.value = true
  try {
    members.value = await $fetch('/api/admin/customers')
  } catch (e) {
    console.error(e)
    showToast('โหลดข้อมูลล้มเหลว กรุณาลองใหม่', 'error')
  } finally {
    loading.value = false
  }
}

/* ================= OPEN ADD ================= */
const openAdd = () => {
  editMode.value = false
  form.value = { id: null, name: '', phone: '', points: 100 }
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
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error')
    return
  }

  isSaving.value = true
  try {
    await $fetch('/api/admin/customer.save', {
      method: 'POST',
      body: form.value
    })
    showModal.value = false
    showToast(editMode.value ? 'แก้ไขข้อมูลสำเร็จ' : 'เพิ่มสมาชิกสำเร็จ')
    await load()
  } catch (e) {
    showToast('เกิดข้อผิดพลาดในการบันทึก', 'error')
  } finally {
    isSaving.value = false
  }
}

/* ================= UPDATE POINT INLINE ================= */
const updatePoints = async (m) => {
  updatingId.value = m.id
  try {
    await $fetch('/api/admin/customer.update', {
      method: 'POST',
      body: { id: m.id, points: m.points }
    })
    showToast('อัปเดตคะแนนเรียบร้อย')
  } catch (e) {
    showToast('อัปเดตคะแนนล้มเหลว', 'error')
  } finally {
    updatingId.value = null
  }
}

/* ================= DELETE LOGIC ================= */
const askRemove = (m) => {
  memberToDelete.value = m
  showConfirm.value = true
}

const confirmRemove = async () => {
  if (!memberToDelete.value) return
  
  try {
    await $fetch('/api/admin/customer.delete', {
      method: 'POST',
      body: { id: memberToDelete.value.id }
    })
    showToast('ลบสมาชิกเรียบร้อยแล้ว')
    await load()
  } catch (e) {
    showToast('ไม่สามารถลบข้อมูลได้', 'error')
  } finally {
    showConfirm.value = false
    memberToDelete.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-4 md:p-8 relative">
    
    <!-- ================= TOAST COMPONENT ================= -->
    <div class="fixed top-5 right-5 z-[999] space-y-2">
      <TransitionGroup name="list">
        <div 
          v-for="toast in toasts" 
          :key="toast.id"
          :class="[
            'px-6 py-3 rounded-xl shadow-lg text-white font-medium flex items-center gap-2 min-w-[250px]',
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
          ]"
        >
          <span v-if="toast.type === 'success'">✅</span>
          <span v-else>❌</span>
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>

    <!-- Header -->
    <div class="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
          <span class="bg-blue-100 p-2 rounded-lg text-2xl">👤</span>
          Member Management
        </h1>
        <p class="text-gray-500 mt-1">จัดการข้อมูลสมาชิกและคะแนนสะสม</p>
      </div>

      <button
        @click="openAdd"
        class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:scale-95 transition text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
        <span>➕</span> เพิ่มสมาชิกใหม่
      </button>
    </div>

    <!-- Table -->
    <div class="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      
      <div v-if="loading" class="p-20 text-center text-gray-400">
        <div class="animate-spin text-4xl mb-2">🌀</div>
        กำลังโหลดข้อมูล...
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="p-4 font-semibold text-gray-600">ชื่อ-เบอร์โทร</th>
              <th class="p-4 font-semibold text-gray-600 text-center">คะแนนสะสม</th>
              <th class="p-4 font-semibold text-gray-600 text-center">ระดับ/ยอดซื้อ</th>
              <th class="p-4 font-semibold text-gray-600 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in members" :key="m.id" class="hover:bg-blue-50/30 transition border-b border-gray-50 last:border-0">
              
              <td class="p-4">
                <div class="font-bold text-gray-800">{{ m.name }}</div>
                <div class="text-sm text-gray-500 flex items-center gap-1">
                  📞 {{ m.phone }}
                </div>
              </td>

              <td class="p-4">
                <div class="flex items-center justify-center gap-2">
                  <input
                    v-model.number="m.points"
                    type="number"
                    class="w-20 text-center border border-gray-200 rounded-lg p-1 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                    :disabled="updatingId === m.id"
                  />
                  <button 
                    @click="updatePoints(m)" 
                    class="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition disabled:opacity-50" 
                    :disabled="updatingId === m.id"
                    title="Save Points">
                    <span v-if="updatingId === m.id" class="animate-spin inline-block">🌀</span>
                    <span v-else>💾</span>
                  </button>
                </div>
              </td>

              <td class="p-4 text-center">
                <div class="text-xl">
                  <span v-if="m.rank === 1">🥇</span>
                  <span v-else-if="m.rank === 2">🥈</span>
                  <span v-else-if="m.rank === 3">🥉</span>
                  <span v-else class="text-gray-300 text-sm">-</span>
                </div>
                <div class="text-xs font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 inline-block mt-1">
                  ฿{{ m.total_spent?.toLocaleString() }}
                </div>
              </td>

              <td class="p-4">
                <div class="flex justify-end gap-2">
                  <button
                    @click="openEdit(m)"
                    class="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl transition flex items-center gap-1 px-3 text-sm font-bold">
                    ✏️ <span class="hidden md:inline">แก้ไข</span>
                  </button>
                  <button
                    @click="askRemove(m)"
                    class="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition flex items-center gap-1 px-3 text-sm font-bold">
                    🗑 <span class="hidden md:inline">ลบ</span>
                  </button>
                </div>
              </td>

            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= FORM MODAL ================= -->
    <Transition name="fade">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" @click="showModal = false"></div>
        
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden z-10 transform transition-all">
          <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 class="text-2xl font-black text-gray-800">
              {{ editMode ? '📝 แก้ไขสมาชิก' : '✨ เพิ่มสมาชิกใหม่' }}
            </h2>
            <button @click="showModal = false" class="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
          </div>

          <div class="p-8 space-y-5">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">ชื่อ-นามสกุล</label>
              <input v-model="form.name" placeholder="ระบุชื่อสมาชิก" class="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-blue-500 focus:outline-none transition" />
            </div>

            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">เบอร์โทรศัพท์</label>
              <input v-model="form.phone" type="tel" placeholder="08x-xxx-xxxx" class="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-blue-500 focus:outline-none transition" />
            </div>

            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1">คะแนนเริ่มต้น</label>
              <input v-model.number="form.points" type="number" class="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-blue-500 focus:outline-none transition" />
            </div>
          </div>

          <div class="p-6 bg-gray-50 flex gap-3">
            <button @click="showModal = false" class="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition">
              ยกเลิก
            </button>
            <button 
              @click="saveMember" 
              :disabled="isSaving"
              class="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition disabled:bg-blue-300 flex justify-center items-center">
              <span v-if="isSaving" class="animate-spin mr-2">🌀</span>
              {{ isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ================= CONFIRM DELETE MODAL ================= -->
    <Transition name="fade">
      <div v-if="showConfirm" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showConfirm = false"></div>
        
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden z-10 text-center p-6">
          <div class="text-5xl mb-4">🗑️</div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">ยืนยันการลบ?</h3>
          <p class="text-gray-500 mb-6">
            คุณต้องการลบสมาชิก <span class="font-bold text-red-500">{{ memberToDelete?.name }}</span> ใช่หรือไม่?
            <br><span class="text-xs text-gray-400">การกระทำนี้ไม่สามารถย้อนกลับได้</span>
          </p>
          
          <div class="flex gap-3">
            <button 
              @click="showConfirm = false" 
              class="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">
              ยกเลิก
            </button>
            <button 
              @click="confirmRemove" 
              class="flex-1 py-2 px-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition">
              ลบข้อมูล
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
/* Transition for Modals */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Transition for Toasts */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Input Number Arrows Removal */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
</style>