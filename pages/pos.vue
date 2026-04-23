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
const receiptTotal = ref(0)
const receiptDiscount = ref(0)
const receiptUsePoints = ref(0)
const receiptFinal = ref(0)
/* USEPOINT */
const usePoints = ref(0)
const discount = ref(0)

const maxUsablePoints = computed(() => {
  const percent = Number(config.value.max_point_percent || 50)
  const pointValue = Number(config.value.point_value || 1)

  if (!pointValue) return 0

  const maxDiscount = (total.value * percent) / 100
  const maxPoints = Math.floor(maxDiscount / pointValue)

  return Math.min(
    customerTotalPoints.value || 0,
    maxPoints
  )
})

watch(usePoints, (val) => {
  if (!customerName.value) {
    usePoints.value = 0
    discount.value = 0
    return
  }

  const safeVal = Number(val || 0)
  const pointValue = Number(config.value.point_value || 1)

  if (safeVal < 0) {
    usePoints.value = 0
    return
  }

  if (safeVal > maxUsablePoints.value) {
    usePoints.value = maxUsablePoints.value
  }

  discount.value = usePoints.value * pointValue
})

const finalTotal = computed(() => {
  return Math.max(0, total.value - discount.value)
})

/* CATEGORY */
const activeCategory = ref('ทั้งหมด')

/* 🔥 NEW: State สำหรับแสดง Modal ใบเสร็จ Digital */
const showReceiptModal = ref(false)

/* 🆕 UI State สำหรับ Toast Notification */
const toast = ref({ show: false, message: '', type: 'info' })
const showToast = (msg, type = 'info') => {
  toast.value = { show: true, message: msg, type }
  setTimeout(() => toast.value.show = false, 3000)
}

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
  config.value = await $fetch('/api/admin/settings')
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
    showToast('🛒 ไม่มีสินค้าในตะกร้า', 'error')
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
        paymentMethod: paymentMethod.value
      }
    })

    orderId.value = res.order_id
    qrCode.value = res.qr_code
    orderPoints.value = res.points || 0
    customerTotalPoints.value = res.total_points || 0
    // 🔥 ใช้ค่าจาก backend เท่านั้น (กันโกง + ตรง 100%)
    receiptTotal.value = res.total
    receiptDiscount.value = res.discount
    receiptUsePoints.value = res.use_points
    receiptFinal.value = res.amount

    if (paymentMethod.value === 'cash') {
      await payCash()
    } else {
      showQR.value = true
      status.value = 'pending'
    }

  } catch (err) {
    console.error(err)
    showToast(err.data?.message || '❌ เกิดข้อผิดพลาดในการสร้างออเดอร์', 'error')
    status.value = 'idle'
  }
}

/* ================= CASH ================= */
const payCash = async () => {
  if (cashReceived.value < finalTotal.value){
    speak('เงินไม่พอ')
    showToast('💸 เงินที่ได้รับไม่พอชำระ', 'error')
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
    showToast('❌ บันทึกการชำระเงินล้มเหลว', 'error')
  }
}

/* ================= TEST (Mock Payment) ================= */
const mockPaid = async () => {
  if (!orderId.value) {
    showToast('⚠️ ยังไม่ได้สร้างบิล กดคิดเงินก่อน', 'warning')
    return
  }

  await $fetch(`/api/order/${orderId.value}/paid`, {
    method: 'POST'
  })

  speak(`ชำระเงินแล้ว ${finalTotal.value} บาท`)
  
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
  usePoints.value = 0
  discount.value = 0
  receiptFinal.value = 0
  finalTotal.value = 0
  
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
  <div class="flex h-screen bg-slate-50 font-sans text-slate-800 relative overflow-hidden">

    <!-- 🆕 Toast Notification (Replaces Alert) -->
    <Transition name="toast">
      <div v-if="toast.show" class="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl border border-white/20 backdrop-blur-md transition-all"
        :class="{
          'bg-emerald-600 text-white': toast.type === 'success',
          'bg-rose-600 text-white': toast.type === 'error',
          'bg-amber-500 text-white': toast.type === 'warning',
          'bg-slate-800 text-white': toast.type === 'info'
        }"
      >
        <span v-if="toast.type === 'success'" class="text-xl">✅</span>
        <span v-if="toast.type === 'error'" class="text-xl">🚫</span>
        <span v-if="toast.type === 'warning'" class="text-xl">⚠️</span>
        <span v-if="toast.type === 'info'" class="text-xl">ℹ️</span>
        <span class="font-semibold text-sm">{{ toast.message }}</span>
      </div>
    </Transition>

    <!-- LEFT: Product Selection -->
    <div class="flex-1 flex flex-col h-full relative z-10">
      
      <!-- Top Bar -->
      <div class="p-6 pb-2">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-2xl font-bold text-slate-700 tracking-tight">🛒 POS System</h1>
          <div class="text-xs text-slate-400 font-mono">V.1.0</div>
        </div>

        <!-- Search Input -->
        <div class="relative group">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg class="h-6 w-6 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref="searchRef"
            v-model="keyword"
            @keyup.enter="handleBarcode"
            class="w-full pl-12 pr-4 py-4 text-xl bg-white border-2 border-slate-200 rounded-2xl shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
            placeholder="ค้นหา / สแกนบาร์โค้ด..."
          />
        </div>

        <!-- Category Tabs -->
        <div class="flex gap-2 overflow-x-auto pb-2 mt-4 scrollbar-hide">
          <button
            v-for="cat in categories"
            :key="cat"
            @click="activeCategory = cat"
            :class="[
              'px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 shadow-sm border',
              activeCategory === cat
                ? 'bg-slate-800 text-white border-slate-800 scale-105 shadow-lg shadow-slate-800/20'
                : 'bg-white text-slate-500 border-slate-100 hover:bg-white hover:border-indigo-200 hover:text-indigo-600'
            ]"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- Product Grid -->
      <div class="flex-1 overflow-y-auto p-6 pt-2">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          <button
            v-for="p in filteredProducts"
            :key="p.id"
            @click="add(p)"
            class="group bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-200 flex flex-col items-start justify-between h-40 relative overflow-hidden"
          >
            <!-- Product Icon Placeholder -->
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors flex items-center justify-center text-4xl text-slate-300 group-hover:text-indigo-200">
              📦
            </div>
            
            <div class="relative z-10 w-full pr-4">
              <h3 class="font-bold text-slate-700 text-left leading-tight line-clamp-2 group-hover:text-indigo-700 transition-colors">
                {{ p.name }}
              </h3>
              <div class="text-xs text-slate-400 mt-1 font-mono">{{ p.barcode || '-' }}</div>
            </div>

            <div class="relative z-10 w-full flex justify-between items-end">
              <div class="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-sm font-bold">
                ฿{{ Number(p.price).toLocaleString() }}
              </div>
              <div class="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-indigo-400 flex items-center justify-center text-xs transition-colors">
                +
              </div>
            </div>
          </button>
        </div>
        
        <!-- Empty State -->
        <div v-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center h-64 text-slate-400 animate-pulse">
          <div class="text-6xl mb-4 opacity-50">🔎</div>
          <div class="text-lg font-medium">ไม่พบสินค้าที่ค้นหา</div>
        </div>
      </div>
    </div>

    <!-- RIGHT: Cart & Payment Panel -->
    <div class="w-full max-w-md bg-white shadow-2xl z-20 flex flex-col border-l border-slate-100">

      <!-- Header & Member -->
      <div class="p-5 border-b border-slate-100 bg-slate-50/50 backdrop-blur">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span class="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg text-sm">🧾</span>
            รายการสั่งซื้อ
          </h2>
          <button v-if="cart.length" @click="cart = []" class="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition">
            ล้างทั้งหมด
          </button>
        </div>
        
        <!-- Member Input -->
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="text-lg">📱</span>
          </div>
          <input 
            v-model="customerPhone" 
            type="tel"
            maxlength="10"
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono tracking-wider placeholder:text-slate-300" 
            placeholder="เบอร์โทรสมาชิก (10 หลัก)" 
          />
        </div>

        <!-- Member Info Display -->
        <Transition name="slide-down">
          <div v-if="customerName" class="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs">
                👤
              </div>
              <div>
                <div class="text-sm font-bold text-emerald-800">{{ customerName }}</div>
                <div class="text-xs text-emerald-600">สมาชิก</div>
              </div>
            </div>
            <div class="bg-white px-3 py-1 rounded-lg text-xs font-bold text-emerald-600 shadow-sm">
              ⭐ {{ customerTotalPoints }} แต้ม
            </div>
          </div>
        </Transition>
        
        <div v-if="memberError" class="mt-2 text-xs text-rose-500 font-medium bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center gap-1">
          <span>⚠️</span> {{ memberError }}
        </div>
      </div>

      <!-- Cart Items List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
        <TransitionGroup name="list">
          <div 
            v-for="c in cart" 
            :key="c.id" 
            class="group bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-3 relative overflow-hidden"
          >
            <!-- Item Details -->
            <div class="flex-1 min-w-0">
              <div class="font-bold text-slate-700 truncate">{{ c.name }}</div>
              <div class="text-xs text-slate-400 mt-0.5">฿{{ c.price }} / ชิ้น</div>
            </div>
            
            <!-- Qty Controls -->
            <div class="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
              <button @click="dec(c)" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white rounded-md transition-colors font-bold text-lg leading-none">−</button>
              <span class="w-8 text-center text-sm font-bold text-slate-700">{{ c.qty }}</span>
              <button @click="inc(c)" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-white rounded-md transition-colors font-bold text-lg leading-none">+</button>
            </div>
            
            <!-- Total Price -->
            <div class="text-right min-w-[80px]">
              <div class="font-bold text-slate-800">฿{{ (c.price * c.qty).toLocaleString() }}</div>
            </div>
            
            <!-- Delete Button -->
            <button @click="remove(c)" class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </TransitionGroup>
        
        <div v-if="!cart.length" class="flex flex-col items-center justify-center h-48 text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl">
          <span class="text-4xl mb-2">🛒</span>
          <span class="text-sm">ยังไม่มีสินค้า</span>
        </div>
      </div>

      <!-- Payment Section -->
      <div class="bg-white p-5 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] space-y-4 z-10">
        
        <!-- Summary Mini -->
        <div class="flex justify-between text-sm text-slate-500">
          <span>{{ cart.reduce((s, i) => s + i.qty, 0) }} รายการ</span>
          <span v-if="orderPoints > 0" class="text-emerald-600 font-medium flex items-center gap-1">
            <span>🎁 ได้แต้ม</span>
            <span>+{{ orderPoints }}</span>
          </span>
        </div>

        <div class="border-t border-dashed border-slate-200 my-2"></div>

        <!-- Total & Payment Method -->
        <div class="flex justify-between items-end mb-4">
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-slate-500">ยอดสุทธิ</span>
            <span class="text-xs text-slate-400">Total Amount</span>
          </div>
          <div class="text-3xl font-bold text-indigo-600">
            ฿{{ (receiptFinal || finalTotal).toLocaleString() }}
          </div>
        </div>

        <!-- Payment Tabs -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <button 
            @click="paymentMethod = 'cash'"
            :class="['flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-sm transition-all', paymentMethod === 'cash' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50 hover:border-slate-200']"
          >
            <span>💵</span> เงินสด
          </button>
          <button 
            @click="paymentMethod = 'qr'"
            :class="['flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-sm transition-all', paymentMethod === 'qr' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50 hover:border-slate-200']"
          >
            <span>📱</span> พร้อมเพย์
          </button>
        </div>

        <!-- Points Redemption -->
        <div v-if="customerName" class="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2 mb-4">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-amber-800 uppercase tracking-wide">ใช้แต้มสะสม</span>
            <span class="text-xs text-amber-600">มี {{ maxUsablePoints }} แต้ม</span>
          </div>
          <div class="flex gap-2">
            <input
              v-model.number="usePoints"
              type="number"
              class="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-right font-bold text-amber-900 outline-none focus:ring-2 focus:ring-amber-300"
              placeholder="0"
            />
            <div class="flex flex-col justify-center px-2">
              <span class="text-xs text-rose-500 font-bold">ลด ฿{{ discount }}</span>
            </div>
          </div>
        </div>

        <!-- Cash Input Area -->
        <div v-if="paymentMethod === 'cash'" class="space-y-3">
          <div class="relative">
            <div class="absolute inset-y-0 left-4 flex items-center text-slate-400">฿</div>
            <input 
              v-model.number="cashReceived" 
              type="number" 
              class="w-full pl-8 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-3xl font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all text-right placeholder:text-slate-200" 
              placeholder="รับเงิน..."
            />
          </div>
          
          <!-- Quick Cash Buttons -->
          <div class="grid grid-cols-4 gap-2">
             <button @click="cashReceived = finalTotal" class="py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 active:scale-95 transition">ยอด</button>
             <button @click="cashReceived += 20" class="py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 active:scale-95 transition">+20</button>
             <button @click="cashReceived += 100" class="py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 active:scale-95 transition">+100</button>
             <button @click="cashReceived += 500" class="py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 active:scale-95 transition">+500</button>
          </div>
          
          <div v-if="change > 0" class="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex justify-between items-center animate-pulse-once">
            <span class="text-sm font-bold text-emerald-700">เงินทอน</span>
            <span class="text-2xl font-black text-emerald-600">฿{{ change.toLocaleString() }}</span>
          </div>
        </div>

        <!-- Main Action Button -->
        <button 
          @click="checkout" 
          :disabled="cart.length === 0"
          :class="[
            'w-full py-4 rounded-2xl text-xl font-bold shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2',
            cart.length > 0 
              ? 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-800/30' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
          ]"
        >
          <span>💳</span>
          <span>คิดเงิน</span>
        </button>

        <!-- Mock Button (Hidden visual style) -->
        <button @click="mockPaid" class="w-full text-[10px] text-slate-300 hover:text-slate-400 py-1 underline decoration-dashed">
          Test: Mock Payment
        </button>
      </div>
    </div>

    <!-- QR Modal -->
    <Transition name="fade">
      <div v-if="showQR" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full relative overflow-hidden border border-white/20">
          <button @click="showQR = false" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-rose-100 hover:text-rose-500 transition">✕</button>
          
          <div class="mb-6">
            <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">📱</div>
            <h3 class="text-xl font-bold text-slate-800">แสกน QR Code</h3>
            <p class="text-sm text-slate-500">พร้อมเพย์ (PromptPay)</p>
          </div>
          
          <div class="p-4 bg-white rounded-2xl shadow-inner border border-slate-100 mb-6">
            <img v-if="qrCode" :src="qrCode" class="w-full aspect-square object-contain mix-blend-multiply" alt="QR Code" />
            <div v-else class="w-full aspect-square flex items-center justify-center">
              <div class="animate-spin text-indigo-500">⟳</div>
            </div>
          </div>
          
          <div class="text-2xl font-black text-slate-800 mb-6">฿{{ finalTotal.toLocaleString() }}</div>
          
          <button @click="mockPaid" class="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-colors">
            ยืนยันการชำระเงิน (Test)
          </button>
        </div>
      </div>
    </Transition>

    <!-- ==================== DIGITAL RECEIPT MODAL ==================== -->
    <Transition name="slide-up">
      <div v-if="showReceiptModal" class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-[60] p-4" @click.self="resetPOS">
        
        <div class="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative animate-pop-in font-sans">
          
          <!-- Header Receipt Look -->
          <div class="bg-slate-800 p-6 pb-8 rounded-b-[40px] text-center relative">
            <div class="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-3 shadow-lg shadow-emerald-500/30">
              ✓
            </div>
            <h1 class="text-xl font-bold text-white">ชำระเงินสำเร็จ</h1>
            <p class="text-slate-400 text-xs mt-1">{{ new Date().toLocaleString('th-TH') }}</p>
          </div>

          <!-- Receipt Body -->
          <div class="px-6 -mt-6">
            <div class="bg-white border border-slate-100 rounded-2xl shadow-lg p-6 space-y-4">
              
              <!-- Shop Info -->
              <div class="text-center border-b border-dashed border-slate-200 pb-4">
                <h2 class="font-bold text-slate-800">{{config.nameshop}}</h2>
                <div class="text-xs text-slate-400 mt-1">Order #{{ orderId }}</div>
              </div>

              <!-- Items -->
              <div class="space-y-3 border-b border-dashed border-slate-200 pb-4">
                <div v-for="item in cart" :key="item.id" class="flex justify-between items-start text-sm">
                  <div class="flex-1 pr-2">
                    <div class="font-medium text-slate-700 truncate">{{ item.name }}</div>
                    <div class="text-xs text-slate-400">{{ item.qty }} x {{ item.price }}</div>
                  </div>
                  <div class="font-bold text-slate-700">฿{{ (item.price * item.qty).toLocaleString() }}</div>
                </div>
              </div>

              <!-- Financial Summary -->
              <div class="space-y-2 text-sm">
                <div class="flex justify-between text-slate-500">
                  <span>ยอดรวม</span>
                  <span>฿{{ (receiptTotal || total).toLocaleString() }}</span>
                </div>
                <div v-if="receiptUsePoints > 0" class="flex justify-between text-rose-500">
                  <span>ใช้แต้ม ({{ receiptUsePoints }})</span>
                  <span>-฿{{ receiptDiscount }}</span>
                </div>
                <div class="flex justify-between font-bold text-lg text-slate-800 pt-2 border-t border-slate-100">
                  <span>ยอดสุทธิ</span>
                  <span>฿{{ (receiptFinal || finalTotal).toLocaleString() }}</span>
                </div>
                
                <div class="flex justify-between text-slate-400 text-xs mt-2 bg-slate-50 p-2 rounded-lg">
                  <span>{{ paymentMethod === 'cash' ? '💵 เงินสด' : '📱 โอนเงิน' }}</span>
                  <span v-if="paymentMethod === 'cash' && change > 0" class="text-emerald-600">ทอน ฿{{ change }}</span>
                </div>
              </div>

              <!-- Member Info (Cleaned up) -->
              <div v-if="customerName" class="bg-indigo-50 p-3 rounded-xl flex justify-between items-center">
                <div>
                  <div class="text-xs font-bold text-indigo-500">สมาชิก: {{ customerName }}</div>
                  <div class="text-xs text-indigo-400">แต้มคงเหลือ: {{ customerTotalPoints }}</div>
                </div>
                <div v-if="orderPoints > 0" class="text-xs font-bold text-emerald-600 bg-white px-2 py-1 rounded-lg shadow-sm">
                  +{{ orderPoints }} แต้ม
                </div>
              </div>

            </div>
          </div>

          <!-- Footer Actions -->
          <div class="p-6">
            <button @click="resetPOS"
              class="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-800/20 transition-all active:scale-95 flex items-center justify-center gap-2">
              <span>🏁</span>
              <span>เสร็จสิ้น / ออเดอร์ใหม่</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style>
/* Hide Scrollbar but allow scroll */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

/* Animations */
.toast-enter-active, .toast-leave-active { transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, -20px) scale(0.9); }

.list-enter-active, .list-leave-active { transition: all 0.3s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(20px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(50px) scale(0.95); }

.slide-down-enter-active { transition: all 0.3s ease; }
.slide-down-enter-from { opacity: 0; transform: translateY(-10px); }

.animate-pop-in {
  animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes pop-in {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.animate-pulse-once {
  animation: pulse-green 0.5s ease-in-out;
}

@keyframes pulse-green {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); background-color: #ecfdf5; }
  100% { transform: scale(1); }
}
</style>