<template>
  <div class="totp-verification">
    <h2>Two-Factor Authentication</h2>
    <p class="subtitle">Please enter the 6-digit code from your authenticator app</p>

    <div class="code-input-container">
      <p-input-text
        v-model="code"
        placeholder="Enter 6-digit code"
        :class="{ 'p-invalid': !!error }"
        maxlength="6"
        keyfilter="int"
        autofocus
      ></p-input-text>
      <small v-if="error" class="p-error">{{ error }}</small>

      <p-button
        label="Verify"
        icon="pi pi-check"
        @click="verifyCode"
        :loading="verifying"
        :disabled="code.length !== 6 || verifying"
        class="verify-button"
      ></p-button>

      <div class="help-text">
        <p>Don't have your authenticator app?</p>
        <p>Please contact support for assistance.</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { AUTH_ERROR_MESSAGES } from '@/constants/appConstants'
import { useToastService } from '@/services/toastService'
import { TOTPService } from '@/services/totpService'
import { defineComponent, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'TOTPVerification',
  props: {
    sessionId: {
      type: String,
      required: true
    }
  },
  setup(props, { emit }) {
    const router = useRouter()
    const { handleError } = useToastService()

    const code = ref('')
    const error = ref('')
    const verifying = ref(false)

    const verifyCode = async () => {
      if (code.value.length !== 6) {
        error.value = 'Please enter a 6-digit code'
        return
      }

      error.value = ''
      verifying.value = true

      try {
        // Use TOTPService to verify the code
        await TOTPService.verifyTOTPLogin(code.value, props.sessionId)

        // If we get here, verification was successful (no error thrown)
        // Navigate to dashboard
        router.push({ name: 'Overview' })

        // Emit success event
        emit('verified')
      } catch (err) {
        console.error('TOTP verification failed:', err)
        error.value = AUTH_ERROR_MESSAGES.TOTP_INVALID
        handleError(err, AUTH_ERROR_MESSAGES.TOTP_INVALID)
      } finally {
        verifying.value = false
      }
    }

    // Reset error when code changes
    watch(code, () => {
      error.value = ''
    })

    return {
      code,
      error,
      verifying,
      verifyCode
    }
  }
})
</script>

<style scoped>
.totp-verification {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

h2 {
  margin-bottom: 0.5rem;
}

.subtitle {
  margin-bottom: 2rem;
  color: var(--text-color-secondary);
}

.code-input-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.p-input-text {
  font-size: 1.5rem;
  text-align: center;
  letter-spacing: 0.5rem;
  font-family: monospace;
}

.verify-button {
  margin-top: 1rem;
}

.help-text {
  margin-top: 2rem;
  font-size: 0.9rem;
  color: var(--text-color-secondary);
}

.help-text p {
  margin: 0.25rem 0;
}

.p-error {
  display: block;
  text-align: center;
}
</style>
