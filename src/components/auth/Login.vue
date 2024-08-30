<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="login-container">
    <p-toast />
    <div class="title">
      <h1>Welcome to LockBox!</h1>
      <h3>Please login to continue</h3>
    </div>

    <div class="credentials">
      <div class="input-field">
        <label for="username-login">Username</label>
        <p-input-text id="username-login" type="text" v-model="username" />
      </div>

      <div class="input-field">
        <label for="password-login">Password</label>
        <p-password id="password-login" v-model="password" fluid :feedback="false"></p-password>
      </div>

      <p-button class="login-btn" label="Login" @click="handleLogin()"></p-button>

      <p>Don't have an account? <router-link to="/register">Register here</router-link></p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
// import { useCookies } from '@/utils/cookies'
import { handleLogin } from '@/utils/auth'
import { useToast } from 'primevue/usetoast'

export default defineComponent({
  setup() {
    const username = ref('')
    const password = ref('')
    const router = useRouter()
    const toast = useToast()
    // const cookies = useCookies()

    const login = async () => {
      try {
        // Handle the login process
        await handleLogin(username.value, password.value)

        // start testing
        // const token = '8EpvcdpegqtFRTTRdg8JhMEZH1oSpIDc7zoB7WYIlfgh5MbdBKcaEPMZ21CWAyr2'
        // cookies.set('auth_token', token, '60s')
        // end testing

        // Redirect to the dashboard on successful login
        router.push({ name: 'Overview' })
      } catch (error) {
        toast.add({ severity: 'error', summary: 'Login failed', detail: error, life: 5000 })
        console.error('Login failed:', error)
      }
    }

    return {
      username,
      password,
      handleLogin: login
    }
  }
})
</script>

<style scoped></style>
