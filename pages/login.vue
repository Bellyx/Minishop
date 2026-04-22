<script setup>
const username = ref('')
const password = ref('')
const error = ref('')

const login = async () => {
  try {
    const res = await $fetch('/api/login', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value
      }
    })

    // เก็บ token
    useCookie('token').value = res.token

    navigateTo('/select')
  } catch (e) {
    error.value = 'login ไม่สำเร็จ'
  }
}
</script>

<template>
  <div style="max-width:300px;margin:auto">
    <h2>Login POS</h2>

    <input v-model="username" placeholder="username" />
    <input v-model="password" type="password" placeholder="password" />

    <button @click="login">เข้าสู่ระบบ</button>

    <p style="color:red">{{ error }}</p>
  </div>
</template>