<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="register-container">
    <p-toast />
    <div class="title">
      <h1>Welcome to LockBox!</h1>
      <h3>Please register to continue</h3>
    </div>

    <div class="credentials">
      <div class="input-field">
        <label class="required" for="username-register">Username</label>
        <p-input-text id="username-register" type="text" v-model="username" />
      </div>

      <div class="input-field">
        <label class="required" for="email-register">Email</label>
        <p-input-text id="email-register" type="email" v-model="email" />
      </div>

      <div class="input-field">
        <label class="required" for="password-register">Password</label>
        <p-password
          id="password-register"
          v-model="password"
          :toggleMask="true"
          fluid
          :feedback="false"
        >
        </p-password>
      </div>

      <div class="input-field">
        <label class="required" for="password-confirmation-register">Confirm Password</label>
        <p-password
          id="password-confirmation-register"
          v-model="confirmPassword"
          :toggleMask="true"
          fluid
          :feedback="false"
        ></p-password>
      </div>

      <p-button
        class="register-btn"
        label="Register"
        :loading="loading"
        @click="handleRegister()"
      ></p-button>

      <p>Already have an account? <router-link to="/login">Login here</router-link></p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { handleRegister } from '@/utils/auth'
import { useToast } from 'primevue/usetoast'

export default defineComponent({
  setup() {
    const username = ref('')
    const email = ref('')
    const password = ref('')
    const confirmPassword = ref('')
    const router = useRouter()
    const toast = useToast()
    const loading = ref(false)

    const register = async () => {
      loading.value = true
      if (password.value !== confirmPassword.value) {
        toast.add({
          severity: 'warn',
          summary: 'Passwords mismatch',
          detail: 'The confirmed password needs to match the password',
          life: 5000
        })
        return
      }
      // Introduce a slight delay to ensure instant rendering of the loader
      setTimeout(async () => {
        try {
          // Handle the registration process
          await handleRegister(username.value, email.value, password.value)

          // Redirect to the dashboard on successful registration
          router.push({ name: 'Overview' })
        } catch (error) {
          toast.add({
            severity: 'error',
            summary: 'Registration failed',
            detail: error,
            life: 5000
          })
          console.error('Registration failed:', error)
        }
      }, 10)
    }

    return {
      username,
      email,
      password,
      confirmPassword,
      loading,
      handleRegister: register
    }
  }
})
</script>

<style scoped></style>
