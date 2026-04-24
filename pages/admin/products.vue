<script setup>
definePageMeta({
  layout: 'admin'
})

const products = ref([])

// โหลดข้อมูลสินค้า
const load = async () => {
  try {
    products.value = await $fetch('/api/admin/products')
  } catch (e) {
    console.error('โหลดข้อมูลล้มเหลว', e)
  }
}

// บันทึกข้อมูลสินค้า (สำหรับแก้ไขต้นทุน, สต็อก, คะแนน)
const saveProduct = async (p) => {
  try {
    await $fetch('/api/admin/product', {
      method: 'PATCH',
      body: {
        id: p.id,
        cost: Number(p.cost),      // แปลงเป็นตัวเลขก่อนส่ง
        stock: Number(p.stock),    // แปลงเป็นตัวเลขก่อนส่ง
        point_base: Number(p.point_base),
        promo_point: Number(p.promo_point)
      }
    })
    alert(`บันทึก ${p.name} เรียบร้อยแล้ว`)
  } catch (e) {
    alert('บันทึกล้มเหลว')
  }
}

// เปิด/ปิดโปรโมชั่น (Toggle)
const togglePromo = async (p) => {
  try {
    await $fetch('/api/admin/product', {
      method: 'PATCH',
      body: {
        id: p.id,
        promo_active: !p.promo_active
      }
    })
    // อัพเดท UI ทันทีโดยไม่ต้องโหลดใหม่ทั้งหน้า (Optimistic UI)
    p.promo_active = !p.promo_active
  } catch (e) {
    alert('เปลี่ยนสถานะล้มเหลว')
  }
}
const showAdd = ref(false)

const newProduct = ref({
  name: '',
  promo_active: false
})

const createProduct = async () => {
  try {
    await $fetch('/api/admin/products', {
      method: 'POST',
      body: newProduct.value
    })

    alert('เพิ่มสินค้าแล้ว')
    showAdd.value = false

    // reset form
    newProduct.value = {
      name: '',
      promo_active: false
    }

    load()

  } catch (e) {
    alert('เพิ่มไม่สำเร็จ')
  }
}

const restockItem = ref(null)
const restockQty = ref(0)
const restockNote = ref('')
const restockLoading = ref(false)

const openRestock = (p) => {
  restockItem.value = p
}

const confirmRestock = async () => {
  if (!restockQty.value) {
    alert('ใส่จำนวนก่อน')
    return
  }

  restockLoading.value = true

  try {
    await $fetch('/api/admin/products/restock', {
      method: 'POST',
      body: {
        product_id: restockItem.value.id,
        qty: restockQty.value,
        note: restockNote.value
      }
    })

    alert('เติมสำเร็จ')

    // update UI ทันที
    restockItem.value.stock += restockQty.value

    // reset
    restockItem.value = null
    restockQty.value = 0
    restockNote.value = ''

  } catch (e) {
    alert('เติมไม่สำเร็จ')
  } finally {
    restockLoading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div v-if="showAdd" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

    <div class="bg-white p-6 rounded w-[400px]">

      <h2 class="text-xl font-bold mb-3">➕ เพิ่มสินค้า</h2>

      <input v-model="newProduct.name" placeholder="ชื่อสินค้า" class="border p-2 w-full mb-2" />
      <input v-model.number="newProduct.price" placeholder="ราคา" type="number" class="border p-2 w-full mb-2" />
      <input v-model.number="newProduct.cost" placeholder="ต้นทุน" type="number" class="border p-2 w-full mb-2" />
      <input v-model.number="newProduct.stock" placeholder="สต็อก" type="number" class="border p-2 w-full mb-2" />
      <input v-model.number="newProduct.point_base" placeholder="แต้มพื้นฐาน" type="number"
        class="border p-2 w-full mb-2" />
      <input v-model.number="newProduct.promo_point" placeholder="แต้มโปร" type="number"
        class="border p-2 w-full mb-2" />

      <label class="flex items-center gap-2 mb-3">
        <input type="checkbox" v-model="newProduct.promo_active" />
        เปิดโปรโมชั่น
      </label>

      <div class="flex gap-2">
        <button @click="createProduct" class="bg-green-500 text-white px-4 py-2 rounded w-full">
          บันทึก
        </button>

        <button @click="showAdd = false" class="bg-gray-300 px-4 py-2 rounded w-full">
          ยกเลิก
        </button>
      </div>

    </div>

  </div>
  <div v-if="restockItem"
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

  <div class="bg-white p-5 rounded-xl w-80 space-y-3">

    <h2 class="font-bold text-lg">
      เติมสินค้า: {{ restockItem.name }}
    </h2>

    <input
      v-model.number="restockQty"
      type="number"
      class="border p-2 w-full rounded"
      placeholder="จำนวน"
    />

    <input
      v-model="restockNote"
      class="border p-2 w-full rounded"
      placeholder="หมายเหตุ (optional)"
    />

    <div class="flex gap-2">
      <button
        @click="confirmRestock"
        :disabled="restockLoading"
        class="flex-1 bg-green-600 text-white p-2 rounded"
      >
        {{ restockLoading ? 'กำลังเติม...' : 'ยืนยัน' }}
      </button>

      <button
        @click="restockItem=null"
        class="flex-1 bg-gray-300 p-2 rounded"
      >
        ยกเลิก
      </button>
    </div>

  </div>
</div>
  <div class="p-6 bg-gray-50 min-h-screen">

    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <span class="text-3xl">📦</span> จัดการสินค้า & สต็อก
      </h1>

      <button @click="load" class="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
          </path>
        </svg>
        รีเฟรช
      </button>
    </div>
    <button @click="showAdd = true" class="bg-green-500 text-white px-4 py-2 rounded-lg">
      ➕ เพิ่มสินค้า
    </button>
    <!-- Card Container -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">

          <!-- HEADER -->
          <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-4 font-semibold">สินค้า</th>
              <th class="px-4 py-4 text-right">ราคาขาย</th>
              <th class="px-4 py-4 text-right text-red-600">ต้นทุน</th>
              <th class="px-4 py-4 text-center">สต็อก</th>
              <th class="px-4 py-4 text-center">คะแนนพื้นฐาน</th>
              <th class="px-4 py-4 text-center">โปรคะแนน</th>
              <th class="px-4 py-4 text-center">สถานะโปร</th>
              <th class="px-4 py-4 text-center">จัดการ</th>
            </tr>
          </thead>

          <!-- BODY -->
          <tbody class="divide-y divide-gray-100">
  <tr v-for="p in products" :key="p.id"
    :class="[
      'border-t',
      p.stock === 0 ? 'bg-red-50' :
      p.stock <= p.min_stock ? 'bg-orange-50' : ''
    ]"
  >

    <!-- ชื่อสินค้า -->
    <td class="p-3">
      <div class="flex items-center gap-2">

        <span class="font-medium">{{ p.name }}</span>

        <span v-if="p.stock === 0"
          class="text-xs bg-red-500 text-white px-2 py-1 rounded animate-pulse">
          ❌ หมด
        </span>

        <span v-else-if="p.stock <= p.min_stock"
          class="text-xs bg-orange-400 text-white px-2 py-1 rounded animate-bounce">
          ⚠️ ใกล้หมด
        </span>

      </div>
    </td>

    <!-- ราคาขาย -->
    <td class="px-4 py-4 text-right font-semibold">
      ฿{{ p.price }}
    </td>

    <!-- ต้นทุน -->
    <td class="px-4 py-4 text-right">
      <input v-model.number="p.cost" type="number"
        class="w-20 text-right border rounded px-2 py-1"/>
    </td>

    <!-- stock -->
    <td class="px-4 py-4 text-center">
      <input v-model.number="p.stock" type="number"
        class="w-16 text-center border rounded px-2 py-1"
        :class="{ 'bg-red-50 text-red-600 font-bold': p.stock <= 0 }"/>
    </td>

    <!-- point -->
    <td class="px-4 py-4 text-center">
      <input v-model.number="p.point_base" type="number"
        class="w-16 text-center border rounded px-2 py-1"/>
    </td>

    <!-- promo -->
    <td class="px-4 py-4 text-center">
      <input v-model.number="p.promo_point" type="number"
        class="w-16 text-center border rounded px-2 py-1"/>
    </td>

    <!-- toggle -->
    <td class="px-4 py-4 text-center">
      <span @click="togglePromo(p)"
        :class="[
          'px-3 py-1 rounded-full text-xs cursor-pointer',
          p.promo_active
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
        ]">
        {{ p.promo_active ? 'ON' : 'OFF' }}
      </span>
    </td>

    <!-- 🔥 ACTION -->
    <td class="px-4 py-4 text-center">
      <div class="flex justify-center gap-2">

        <!-- เติม stock -->
        <button
          @click="openRestock(p)"
          class="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded"
        >
          ➕ เติม
        </button>

        <!-- save -->
        <button
          @click="saveProduct(p)"
          class="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded"
        >
          💾 บันทึก
        </button>

      </div>
    </td>

  </tr>
</tbody>

        </table>
      </div>
    </div>

  </div>
</template>

