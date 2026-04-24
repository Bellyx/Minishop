<template>
  <div class="flex h-screen bg-gray-100">

    <!-- SIDEBAR -->
    <aside class="w-64 bg-white shadow-lg p-4">

      <h1 class="text-xl font-bold mb-6">
        🧾 Admin POS
      </h1>

      <nav class="space-y-2">

        <NuxtLink
          to="/admin"
          class="block p-2 rounded hover:bg-gray-200"
          active-class="bg-gray-300 font-bold"
        >
          📊 Dashboard
        </NuxtLink>
         <NuxtLink
          to="/admin/orders"
          class="block p-2 rounded hover:bg-gray-200"
          active-class="bg-gray-300 font-bold"
        >
          📊 หน้าออร์เดอ
        </NuxtLink>

        <NuxtLink
          to="/admin/products"
          class="block p-2 rounded hover:bg-gray-200"
          active-class="bg-gray-300 font-bold"
        >
          📦 สินค้า
        </NuxtLink>

        <NuxtLink
          to="/pos"
          class="block p-2 rounded hover:bg-gray-200"
        >
          🛒 หน้าขาย
        </NuxtLink>

        <NuxtLink
          to="/admin/members"
          class="block p-2 rounded hover:bg-gray-200"
        >
          🛒 สมาชิก
        </NuxtLink>
        <NuxtLink
          to="/admin/sumarise"
          class="block p-2 rounded hover:bg-gray-200"
        >
          🛒 ยอดขายทั้งหมด
        </NuxtLink>
        <NuxtLink
          to="/admin/closeday"
          class="block p-2 rounded hover:bg-gray-200"
        >
          🛒 ปิดยอดรายวัน
        </NuxtLink>
             <NuxtLink
          to="/admin/historylog"
          class="block p-2 rounded hover:bg-gray-200"
        >
          🛒 ประวัติทั้งหมด
        </NuxtLink>
             <NuxtLink
          to="/admin/settings"
          class="block p-2 rounded hover:bg-gray-200"
        >
          🛒 ตั้งค่า
        </NuxtLink>
      </nav>

    </aside>

    <!-- CONTENT -->
    <main class="flex-1 p-6 overflow-auto">
      <slot />
    </main>

  </div>
</template>