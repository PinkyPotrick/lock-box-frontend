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
        <p-input-text
          id="username-register"
          type="text"
          v-model="username"
          :class="{ 'p-invalid': submitted && !username }"
          required
        />
        <small v-if="submitted && !username" class="p-error">Username is required.</small>
      </div>

      <div class="input-field">
        <label class="required" for="email-register">Email</label>
        <p-input-text
          id="email-register"
          type="email"
          v-model="email"
          :class="{ 'p-invalid': submitted && !email }"
          required
        />
        <small v-if="submitted && !email" class="p-error">Email is required.</small>
      </div>

      <div class="input-field password-wrapper">
        <label class="required" for="password-register">Password</label>
        <p-password
          id="password-register"
          v-model="password"
          :class="{ 'p-invalid': submitted && !password }"
          :feedback="false"
          :toggleMask="true"
          fluid
          required
          appendTo="self"
        ></p-password>
        <small v-if="submitted && !password" class="p-error">Password is required.</small>

        <div class="password-errors-container" v-if="passwordErrors.length">
          <small
            v-for="(error, index) in passwordErrors"
            :key="index"
            class="p-error"
            style="display: block"
          >
            {{ error }}
          </small>
        </div>
      </div>

      <div class="input-field">
        <label class="required" for="password-confirmation-register">Confirm Password</label>
        <p-password
          id="password-confirmation-register"
          v-model="confirmPassword"
          :class="{ 'p-invalid': submitted && !confirmPassword }"
          :toggleMask="true"
          fluid
          :feedback="false"
          required
        ></p-password>
        <small v-if="submitted && !confirmPassword" class="p-error"
          >Confirm password is required.</small
        >
        <small v-else-if="mismatchError" class="p-error">{{ mismatchError }}</small>
      </div>

      <p-button
        class="register-btn"
        label="Register"
        :loading="loading"
        @click="handleRegister()"
      ></p-button>

      <p>
        Already have an account?
        <router-link to="/login">Login here</router-link>
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { AUTH_SUCCESS_MESSAGES } from '@/constants/appConstants'
import { handleRegister } from '@/services/authService'
import { useToastService } from '@/services/toastService'
import { defineComponent, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  setup() {
    const username = ref('')
    const email = ref('')
    const password = ref('')
    const confirmPassword = ref('')
    const mismatchError = ref('')
    const passwordErrors = ref<string[]>([])
    const router = useRouter()
    const loading = ref(false)
    const submitted = ref(false)

    // Use the toast service instead of useToast
    const { handleError, handleSuccess, handleWarning } = useToastService()

    // Watch for mismatched passwords
    watch([password, confirmPassword], () => {
      mismatchError.value =
        password.value && confirmPassword.value && password.value !== confirmPassword.value
          ? 'Passwords do not match'
          : ''
    })

    // Watch password to store (and display) validation errors in real time
    watch(password, () => {
      const errors: string[] = []
      if (password.value.length > 0) {
        if (password.value.length < 8) {
          errors.push('Must be at least 8 characters.')
        }
        if (!/[A-Z]/.test(password.value)) {
          errors.push('Must contain an uppercase letter.')
        }
        if (!/\d/.test(password.value)) {
          errors.push('Must contain a number.')
        }
      }
      passwordErrors.value = errors
    })

    const register = async () => {
      submitted.value = true

      // Basic check for required fields
      if (!username.value || !email.value || !password.value || !confirmPassword.value) {
        handleWarning('Please fill in all required fields', 'Required fields missing')
        return
      }

      // If still mismatched, return
      if (mismatchError.value) {
        handleWarning(mismatchError.value, 'Passwords mismatch')
        return
      }

      // If we have password-specific validation errors
      if (passwordErrors.value.length) {
        handleWarning(
          'Please adjust your password according to the rules',
          'Weak or invalid password'
        )
        return
      }

      loading.value = true
      // Introduce a slight delay to ensure instant rendering of the loader
      setTimeout(async () => {
        try {
          // Handle the registration process
          await handleRegister(username.value, email.value, password.value)
          loading.value = false

          // Show success message
          handleSuccess(AUTH_SUCCESS_MESSAGES.REGISTER_SUCCESS)

          // Redirect to the dashboard on successful registration
          router.push({ name: 'Overview' })
        } catch (error) {
          handleError(error, 'Registration failed')
          console.error('Registration failed:', error)
          loading.value = false
        }
      }, 10)
    }

    return {
      username,
      email,
      password,
      confirmPassword,
      mismatchError,
      passwordErrors,
      loading,
      submitted,
      handleRegister: register
    }
  }
})
</script>

<style scoped></style>
