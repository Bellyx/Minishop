<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

/* ================= STATE ================= */
const products = ref([])
const cart = ref([])
const keyword = ref('')
const searchRef = ref(null)

const orderId = ref(null)
const qrCode = ref(null)
const showQR = ref(false)
const status = ref('idle')

const orderPoints = ref(0)
const customerTotalPoints = ref(0)

/* MEMBER */
const customerPhone = ref('')
const customerName = ref('')
const memberError = ref('')

/* PAYMENT */
const paymentMethod = ref('cash')
const cashReceived = ref(0)

/* USEPOINT */
const usePoints = ref(0)
const discount = ref(0)

const maxUsablePoints = computed(() => {
  const percent = Number(config.value.max_point_percent || 50)

  const maxByPercent = Math.floor((total.value * percent) / 100)

  return Math.min(
    customerTotalPoints.value,
    maxByPercent
  )
})

watch(usePoints, (val) => {
  if (!customerName.value) {
    usePoints.value = 0
    return
  }

  if (val < 0) usePoints.value = 0

  if (val > maxUsablePoints.value) {
    usePoints.value = maxUsablePoints.value
  }

  const pointValue = Number(config.value.point_value || 1)

  discount.value = usePoints.value * pointValue
})

const finalTotal = computed(() => {
  return Math.max(0, total.value - discount.value)
})

/* CATEGORY */
const activeCategory = ref('ทั้งหมด')

/* 🔥 NEW: State สำหรับแสดง Modal ใบเสร็จ Digital */
const showReceiptModal = ref(false)

/* ================= LOAD ================= */
const load = async () => {
  try {
    const data = await $fetch('/api/admin/products')
    products.value = data
    localStorage.setItem('products', JSON.stringify(data))
  } catch (e) {
    loadOffline()
  }
}

const loadOffline = () => {
  const cache = localStorage.getItem('products')
  if (cache) products.value = JSON.parse(cache)
}

const config = ref({})

onMounted(async () => {
  config.value = await $fetch('/api/settings')
})

/* ================= COMPUTED ================= */
const categories = computed(() => {
  const cats = new Set(products.value.map(p => p.category).filter(Boolean))
  return ['ทั้งหมด', ...cats]
})

const filteredProducts = computed(() => {
  return products.value.filter(p => {
    const matchKeyword = p.name.toLowerCase().includes(keyword.value.toLowerCase()) ||
                         (p.barcode && p.barcode.includes(keyword.value))
    const matchCategory = activeCategory.value === 'ทั้งหมด' || p.category === activeCategory.value
    return matchKeyword && matchCategory
  })
})

const total = computed(() =>
  cart.value.reduce((s, i) => s + i.price * i.qty, 0)
)

const change = computed(() =>
  cashReceived.value - finalTotal.value
)

/* ================= BARCODE & SEARCH ================= */
const handleBarcode = () => {
  const code = keyword.value.trim()
  if (!code) return

  const found = products.value.find(p => p.barcode === code)

  if (found) {
    add(found)
    keyword.value = ''
    nextTick(() => searchRef.value?.focus())
  }
}

/* ================= CART ================= */
const add = (p) => {
  const f = cart.value.find(i => i.id === p.id)
  if (f) f.qty++
  else cart.value.push({ ...p, qty: 1 })
  nextTick(() => searchRef.value?.focus())
}

const inc = (i) => i.qty++

const dec = (i) => {
  i.qty--
  if (i.qty <= 0) remove(i)
}

const remove = (i) => {
  cart.value = cart.value.filter(x => x.id !== i.id)
}

/* ================= SPEAK ================= */
let voice = null

const initVoice = () => {
  if (typeof window === 'undefined') return
  const voices = speechSynthesis.getVoices()
  voice = voices.find(v => v.lang.includes('th')) || null
}

const speak = (text) => {
  if (!speechSynthesis) return
  const msg = new SpeechSynthesisUtterance(text)
  if (voice) msg.voice = voice
  msg.lang = 'th-TH'
  speechSynthesis.speak(msg)
}

/* ================= MEMBER AUTO ================= */
watch(customerPhone, async (val) => {
  if (val.length < 9) {
    customerName.value = ''
    customerTotalPoints.value = 0
    memberError.value = ''
    return
  }

  try {
    const res = await $fetch('/api/customer/find', {
      query: { phone: val }
    })

    if (res) {
      customerName.value = res.name
      customerTotalPoints.value = res.points
      memberError.value = ''
      speak(`สวัสดี ${res.name}`)
    } else {
      customerName.value = ''
      memberError.value = '❌ ไม่พบสมาชิก'
    }
  } catch {
    customerName.value = ''
    memberError.value = '❌ เชื่อมต่อผิดพลาด'
  }
})

/* ================= CHECKOUT ================= */
const checkout = async () => {
  if (!cart.value.length) {
    alert('ไม่มีสินค้าในตะกร้า')
    return
  }

  status.value = 'loading'
  
  try {
    const res = await $fetch('/api/create-order', {
      method: 'POST',
      body: {
        items: cart.value,
        customerName: customerName.value,
        customerPhone: customerPhone.value,
        usePoints: usePoints.value,
        // total: finalTotal.value,
        paymentMethod: paymentMethod.value // 🔥 เพิ่ม
      }
    })

    orderId.value = res.order_id
    qrCode.value = res.qr_code
    orderPoints.value = res.points || 0
    customerTotalPoints.value = res.total_points || 0

    if (paymentMethod.value === 'cash') {
      await payCash()
    } else {
      showQR.value = true
      status.value = 'pending'
    }

  } catch (err) {
    console.error(err)
    alert(err.data?.message || 'เกิดข้อผิดพลาดในการสร้างออเดอร์')
    status.value = 'idle'
  }
}

/* ================= CASH ================= */
const payCash = async () => {
  if (cashReceived.value < finalTotal.value){
    speak('เงินไม่พอ')
    alert('เงินที่ได้รับไม่พอชำระ')
    return
  }

  try {
    await $fetch(`/api/order/${orderId.value}/paid`, {
      method: 'POST'
    })

    status.value = 'paid'

    const changeVal = change.value
    speak(`รับเงินแล้ว ทอน ${changeVal} บาท`)
    
    // 🔥 เปลี่ยนจาก printReceipt() เป็นการแสดง Modal
    showReceiptModal.value = true

  } catch (e) {
    alert('บันทึกการชำระเงินล้มเหลว')
  }
}

/* ================= TEST (Mock Payment) ================= */
const mockPaid = async () => {
  if (!orderId.value) {
    alert('ยังไม่ได้สร้างบิล กดคิดเงินก่อน')
    return
  }

  await $fetch(`/api/order/${orderId.value}/paid`, {
    method: 'POST'
  })

  speak(`ชำระเงินแล้ว ${total.value} บาท`)
  
  // ปิด QR Modal ก่อน (ถ้าเปิดอยู่)
  showQR.value = false
  // 🔥 แสดงใบเสร็จ Digital
  showReceiptModal.value = true
}

/* ================= RESET ================= */
const resetPOS = () => {
  cart.value = []
  orderId.value = null
  qrCode.value = null
  cashReceived.value = 0
  customerName.value = ''
  customerPhone.value = ''
  showQR.value = false
  showReceiptModal.value = false // ปิด Modal ด้วย
  status.value = 'idle'
  orderPoints.value = 0
  
  nextTick(() => {
    searchRef.value?.focus()
  })
}

/* ================= KEYBOARD ================= */
const handleKey = (e) => {
  if (e.key === 'Escape') {
    if (showReceiptModal.value) showReceiptModal.value = false
    else if (showQR.value) showQR.value = false
    else if (cart.value.length) cart.value = []
  }
}

/* ================= INIT ================= */
onMounted(async () => {
  await load()
  initVoice()
  window.addEventListener('keydown', handleKey)
  
  nextTick(() => {
    searchRef.value?.focus()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey)
})
</script>

<template>
  <div class="flex h-screen bg-slate-100 font-sans text-slate-800">

    <!-- LEFT: Product Selection -->
    <div class="flex-1 flex flex-col overflow-hidden p-4">
      
      <!-- Search & Categories -->
      <div class="mb-4 space-y-3">
        <input
          ref="searchRef"
          v-model="keyword"
          @keyup.enter="handleBarcode"
          class="w-full p-4 text-xl border-2 border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
          placeholder="🔍 ค้นหาสินค้า / ยิงบาร์โค้ด (Enter)"
        />

        <!-- Category Tabs -->
        <div class="flex gap-2 overflow-x-auto pb-1">
          <button
            v-for="cat in categories"
            :key="cat"
            @click="activeCategory = cat"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all shadow-sm',
              activeCategory === cat
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            ]"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- Product Grid -->
      <div class="flex-1 overflow-y-auto pr-2">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          <button
            v-for="p in filteredProducts"
            :key="p.id"
            @click="add(p)"
            class="bg-white p-3 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-400 hover:shadow-md active:scale-95 transition-all flex flex-col items-center justify-center aspect-square"
          >
            <div class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-2xl mb-2 text-slate-500">
              📦
            </div>
            <div class="font-semibold text-slate-700 text-center text-sm leading-tight line-clamp-2">
              {{ p.name }}
            </div>
            <div class="text-indigo-600 font-bold mt-1">
              ฿{{ p.price }}
            </div>
          </button>
        </div>
        
        <div v-if="filteredProducts.length === 0" class="text-center text-slate-400 mt-10">
          ไม่พบสินค้า
        </div>
      </div>
    </div>

    <!-- RIGHT: Cart & Payment -->
    <div class="w-full max-w-md bg-white border-l border-slate-200 flex flex-col shadow-xl">

      <!-- Header & Member -->
      <div class="p-4 border-b border-slate-100 bg-slate-50">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-lg font-bold text-slate-700">🧾 รายการสั่งซื้อ</h2>
          <button v-if="cart.length" @click="cart = []" class="text-xs text-red-500 hover:text-red-700 font-medium">
            ล้างทั้งหมด
          </button>
        </div>
        
        <div class="space-y-2">
          <input 
            v-model="customerPhone" 
            class="w-full p-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" 
            placeholder="📱 เบอร์โทรสมาชิก (กด 10 หลัก)" 
          />
          
          <div v-if="customerName" class="p-2 bg-green-50 border border-green-100 rounded-lg text-sm flex justify-between">
            <span class="text-green-700 font-medium">👤 {{ customerName }}</span>
            <span class="text-green-600">⭐ {{ customerTotalPoints }} แต้ม</span>
          </div>
          <div v-if="memberError" class="text-red-500 text-xs">{{ memberError }}</div>
        </div>
      </div>

      <!-- Cart Items -->
      <div class="flex-1 overflow-y-auto p-4 space-y-2">
        <div v-if="!cart.length" class="text-center text-slate-400 pt-10">
          <div class="text-4xl mb-2">🛒</div>
          ยังไม่มีสินค้า
        </div>

        <div 
          v-for="c in cart" 
          :key="c.id" 
          class="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100"
        >
          <div class="flex-1">
            <div class="font-medium text-sm text-slate-700">{{ c.name }}</div>
            <div class="text-xs text-slate-500">฿{{ c.price }} x {{ c.qty }}</div>
          </div>
          
          <div class="flex items-center gap-1 bg-white rounded-md border border-slate-200">
            <button @click="dec(c)" class="w-7 h-7 font-bold text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-l-md">-</button>
            <span class="w-8 text-center text-sm font-semibold">{{ c.qty }}</span>
            <button @click="inc(c)" class="w-7 h-7 font-bold text-slate-500 hover:bg-green-50 hover:text-green-600 rounded-r-md">+</button>
          </div>
          
          <div class="text-right w-20">
            <div class="font-bold text-slate-800">฿{{ c.price * c.qty }}</div>
          </div>
          
          <button @click="remove(c)" class="text-slate-300 hover:text-red-500 transition p-1">
            🗑️
          </button>
        </div>
      </div>

      <!-- Payment Section -->
      <div class="p-4 bg-white border-t border-slate-200 space-y-3">
        
        <!-- Summary -->
        <div class="space-y-1 text-sm text-slate-600 mb-3">
          <div class="flex justify-between">
            <span>รวมสินค้า</span>
            <span>{{ cart.reduce((s, i) => s + i.qty, 0) }} ชิ้น</span>
          </div>
          <div v-if="orderPoints" class="flex justify-between text-green-600">
            <span>🎁 ได้รับแต้ม</span>
            <span>+{{ orderPoints }}</span>
          </div>
        </div>
        <div v-if="usePoints > 0" class="flex justify-between text-red-500">
        <span>ใช้แต้ม</span>
        <span>-{{ usePoints }}</span>
      </div>

        <div class="flex justify-between items-center text-xl font-bold text-slate-800 mb-2">
          <span>ยอดรวมสุทธิ</span>
          <span class="text-indigo-600">฿{{ total }}</span>
        </div>

        <!-- Payment Method Selection -->
        <div class="flex gap-2 mb-3">
          <button 
            @click="paymentMethod = 'cash'"
            :class="['flex-1 p-2 border-2 rounded-lg font-medium text-sm transition', paymentMethod === 'cash' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500']"
          >
            💵 เงินสด
          </button>
          <button 
            @click="paymentMethod = 'qr'"
            :class="['flex-1 p-2 border-2 rounded-lg font-medium text-sm transition', paymentMethod === 'qr' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500']"
          >
            📱 พร้อมเพย์/QR
          </button>
        </div>

        <div v-if="customerName" class="bg-yellow-50 p-3 rounded-lg space-y-2">

          <div class="text-sm text-gray-600">
            ใช้แต้มได้สูงสุด {{ maxUsablePoints }} แต้ม
          </div>

          <input
            v-model.number="usePoints"
            type="number"
            class="w-full p-2 border rounded text-right"
            placeholder="ใช้แต้ม..."
          />

          <div class="flex justify-between text-sm text-green-600">
            <span>ส่วนลด</span>
            <span>-฿{{ discount }}</span>
          </div>

        </div>
        <!-- Cash Input -->
        <div v-if="paymentMethod === 'cash'" class="space-y-2">
          <input 
            v-model.number="cashReceived" 
            type="number" 
            class="w-full p-3 border-2 border-slate-200 rounded-lg text-lg font-bold focus:border-indigo-500 outline-none text-right" 
            placeholder="รับเงินมา..."
          />
          <div class="grid grid-cols-4 gap-1">
             <button @click="cashReceived = finalTotal" class="bg-slate-100 p-1 rounded text-xs font-bold hover:bg-slate-200">=ยอด</button>
             <button @click="cashReceived += 20" class="bg-slate-100 p-1 rounded text-xs font-bold hover:bg-slate-200">+20</button>
             <button @click="cashReceived += 100" class="bg-slate-100 p-1 rounded text-xs font-bold hover:bg-slate-200">+100</button>
             <button @click="cashReceived += 500" class="bg-slate-100 p-1 rounded text-xs font-bold hover:bg-slate-200">+500</button>
          </div>
          
          <div v-if="change > 0" class="p-3 bg-amber-50 border border-amber-100 rounded-lg text-center">
            <div class="text-xs text-amber-600">เงินทอน</div>
            <div class="text-2xl font-bold text-amber-700">฿{{ change }}</div>
          </div>
        </div>

        <!-- Actions -->
        <button 
          @click="checkout" 
          :disabled="cart.length === 0"
          :class="[
            'w-full p-4 rounded-xl text-xl font-bold shadow-lg transition-all',
            cart.length > 0 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl active:scale-[0.99]' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          ]"
        >
          💳 คิดเงิน
        </button>

        <button @click="mockPaid" class="w-full p-2 text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 rounded-lg">
          🧪 ทดสอบจ่ายเงิน (Mock)
        </button>
      </div>
    </div>

    <!-- QR Modal (Original) -->
    <div v-if="showQR" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-2xl shadow-2xl text-center max-w-sm w-full mx-4 relative">
        <button @click="showQR = false" class="absolute top-2 right-2 text-slate-400 hover:text-slate-800 text-2xl">&times;</button>
        
        <h3 class="text-xl font-bold text-slate-700 mb-2">สแกนเพื่อชำระเงิน</h3>
        <div class="text-3xl font-bold text-indigo-600 mb-4">฿{{ total }}</div>
        
        <div class="bg-white p-4 rounded-lg border border-slate-100 inline-block mb-4">
          <img v-if="qrCode" :src="qrCode" class="w-48 h-48 mx-auto" alt="QR Code" />
          <div v-else class="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400">
            กำลังโหลด QR...
          </div>
        </div>
        
        <div class="text-sm text-slate-500">รอการชำระเงิน...</div>
        <button @click="mockPaid" class="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600">
          ยืนยันการชำระเงินแล้ว (Test)
        </button>
      </div>
    </div>

    <!-- ==================== DIGITAL RECEIPT MODAL (NEW) ==================== -->
    <Transition name="fade">
      <div v-if="showReceiptModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" @click.self="resetPOS">
        
        <!-- Receipt Paper Container -->
        <div class="bg-white w-full max-w-sm rounded-lg shadow-2xl overflow-hidden relative animate-pop-in">
          
          <!-- Close Button (X) -->
          <button @click="resetPOS" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-2xl z-10">
            &times;
          </button>

          <!-- Receipt Content -->
          <div class="p-6 text-center border-b border-dashed border-gray-300 bg-gray-50">
            <div class="text-3xl mb-1">✅</div>
            <h1 class="text-xl font-bold text-gray-800">ชำระเงินสำเร็จ</h1>
            <div class="text-sm text-gray-500 mt-1">{{ new Date().toLocaleString('th-TH') }}</div>
          </div>

          <div class="p-6 space-y-4 text-sm text-left">
            <!-- Shop Info -->
            <div class="text-center border-b border-dashed pb-4">
              <h2 class="font-bold text-lg">☕ Coffee Shop POS</h2>
              <div class="text-xs text-gray-500">สาขาหลัก | Tel: 08x-xxx-xxxx</div>
              <div class="text-xs text-gray-400 mt-1">บิลเลขที่: {{ orderId }}</div>
            </div>

            <!-- Items List -->
            <div class="space-y-2 border-b border-dashed pb-4">
              <div class="flex justify-between text-xs text-gray-500 mb-2">
                <span class="w-1/2">รายการ</span>
                <span class="w-1/4 text-center">จำนวน</span>
                <span class="w-1/4 text-right">ราคา</span>
              </div>
              <div v-for="item in cart" :key="item.id" class="flex justify-between items-center">
                <span class="w-1/2 font-medium truncate">{{ item.name }}</span>
                <span class="w-1/4 text-center text-gray-600">{{ item.qty }}</span>
                <span class="w-1/4 text-right font-semibold">฿{{ item.price * item.qty }}</span>
              </div>
            </div>

            <!-- Summary -->
            <div class="space-y-1">

              <!-- 🔹 ยอดก่อนลด -->
              <div class="flex justify-between text-gray-600">
                <span>ยอดก่อนลด</span>
                <span>฿{{ total }}</span>
              </div>

              <!-- 🔹 ใช้แต้ม -->
              <div v-if="usePoints > 0" class="flex justify-between text-red-500">
                <span>คุณประหยัดไป</span>
                <span>-฿{{ usePoints }} บาท</span>
              </div>

              <!-- 🔹 ยอดสุทธิ -->
              <div class="flex justify-between font-bold text-base">
                <span>ยอดสุทธิ</span>
                <span>฿{{ finalTotal }}</span>
              </div>

              <!-- 🔹 เงินสด -->
            <div class="flex justify-between">
                <span>วิธีชำระเงิน</span>
                <span>
                  {{ paymentMethod === 'cash' ? 'เงินสด' : 'QR / โอนเงิน' }}
                </span>
              </div>

              <!-- 🔹 เงินทอน -->
              <div v-if="paymentMethod === 'cash' && change > 0"
                  class="flex justify-between text-green-600 font-semibold">
                <span>ทอนเงิน</span>
                <span>฿{{ change }}</span>
              </div>

              <!-- 🔹 QR -->
              <!-- <div v-if="paymentMethod === 'qr'"
                  class="flex justify-between text-indigo-600 font-semibold">
                <span>ชำระโดย</span>
                <span>โอนเงิน/QR</span>
              </div> -->

            </div>
        <!-- MEMBER -->
        <div v-if="customerName" class="text-sm mt-2">
          👤 {{ customerName }}
        </div>

        <!-- แต้มรวม -->
        <div v-if="customerName" class="text-sm text-blue-600">
          ⭐ แต้มรวม {{ customerTotalPoints }}
        </div>
            <!-- Points -->
          <div v-if="customerName && orderPoints > 0"
            class="bg-indigo-50 p-3 rounded-lg text-indigo-700 flex justify-between items-center">
            <span>🎁 ได้รับแต้มสะสม</span>
            <span class="font-bold">+{{ orderPoints }} Points</span>
          </div>
          </div>
          <div v-if="customerName" class="bg-green-50 p-3 rounded-lg space-y-1">
            <div class="flex justify-between text-green-700">
              <span>👤 สมาชิก</span>
              <span class="font-semibold">{{ customerName }}</span>
            </div>

            <div class="flex justify-between text-blue-600">
              <span>⭐ แต้มสะสม</span>
              <span class="font-bold">{{ customerTotalPoints }}</span>
            </div>

          </div>
          <!-- Footer Actions -->
          <div class="p-4 bg-gray-50 space-y-2">
            <button @click="resetPOS"
              class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition active:scale-95">
              เสร็จสิ้น (เริ่มออเดอร์ใหม่)
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style>
/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: #f1f5f9;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Animation for Modal */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.animate-pop-in {
  animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes pop-in {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>