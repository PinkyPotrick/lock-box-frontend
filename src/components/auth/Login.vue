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
        <p-input-text
          id="username-login"
          type="text"
          v-model="username"
          :class="{ 'p-invalid': submitted && !username }"
        />
        <small v-if="submitted && !username" class="p-error">Username is required.</small>
      </div>

      <div class="input-field">
        <label for="password-login">Password</label>
        <p-password
          id="password-login"
          v-model="password"
          fluid
          :feedback="false"
          :class="{ 'p-invalid': submitted && !password }"
        ></p-password>
        <small v-if="submitted && !password" class="p-error">Password is required.</small>
      </div>

      <p-button
        class="login-btn"
        label="Login"
        :loading="loading"
        @click="handleLogin()"
      ></p-button>

      <p>
        Don't have an account?
        <router-link to="/register">Register here</router-link>
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { handleLogin } from '@/services/authService'
import { useToastService } from '@/services/toastService'

export default defineComponent({
  setup() {
    const username = ref('')
    const password = ref('')
    const router = useRouter()
    const loading = ref(false)
    const submitted = ref(false)
    const { handleError, handleWarning } = useToastService()

    const login = async () => {
      submitted.value = true

      // Basic check for required fields
      if (!username.value || !password.value) {
        handleWarning('Please enter your username and password', 'Required fields missing')
        return
      }

      loading.value = true
      // Introduce a slight delay to ensure instant rendering of the loader
      setTimeout(async () => {
        try {
          // Handle the login process
          await handleLogin(username.value, password.value)
          loading.value = false
          // Redirect to the dashboard on successful login
          router.push({ name: 'Overview' })
        } catch (error) {
          handleError(error, 'Login failed')
        } finally {
          loading.value = false
        }
      }, 10)
    }

    return {
      username,
      password,
      loading,
      submitted,
      handleLogin: login
    }
  }
})
</script>

<style scoped></style>
