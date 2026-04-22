<script setup>
const goPOS = () => {
  navigateTo('/pos')
}

const goAdmin = () => {
  navigateTo('admin/')
}

const logout = () => {
  localStorage.removeItem('token')
  navigateTo('/login')
}
</script>

<template>
  <div style="text-align:center;margin-top:50px">
    <h1>เลือกระบบ</h1>

    <button @click="goPOS">🛒 หน้าร้าน (POS)</button>
    <br /><br />
    <button @click="goAdmin">🧑‍💼 หลังร้าน</button>

    <br /><br />
    <button @click="logout">ออกจากระบบ</button>
  </div>
</template>