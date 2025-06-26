<template>
  <p-dialog
    v-model:visible="visible"
    :header="title"
    :modal="true"
    :closable="false"
    :dismissableMask="false"
    class="totp-operation-dialog"
  >
    <div class="totp-verification">
      <p>Please enter your authenticator code to continue with this sensitive operation.</p>

      <div class="countdown-wrapper" :class="{ warning: timeRemaining < 15 }">
        <span class="countdown-label">Time remaining:</span>
        <span class="countdown-timer">{{ formatTime(timeRemaining) }}</span>
      </div>

      <div class="attempts-wrapper" :class="{ warning: globalAttemptsRemaining === 1 }">
        <span class="attempts-label">Verification attempts remaining:</span>
        <span class="attempts-counter">{{ globalAttemptsRemaining }}/{{ maxAttempts }}</span>
      </div>

      <div v-if="globalAttemptsRemaining === 1" class="lockout-warning">
        <i class="pi pi-exclamation-triangle"></i>
        <span
          >Warning: Your last attempt! If this fails, verification will be locked for 5
          minutes.</span
        >
      </div>

      <div class="code-input-container">
        <p-input-text
          v-model="code"
          placeholder="Enter 6-digit code"
          :class="{ 'p-invalid': !!error }"
          maxlength="6"
          keyfilter="int"
          autofocus
          @keydown.enter="verify"
        ></p-input-text>
        <small v-if="error" class="p-error">{{ error }}</small>
      </div>
    </div>

    <template #footer>
      <p-button label="Cancel" icon="pi pi-times" @click="cancel" class="p-button-text" />
      <p-button
        label="Verify"
        icon="pi pi-check"
        @click="verify"
        :loading="verifying"
        :disabled="code.length !== 6 || verifying"
      />
    </template>
  </p-dialog>
</template>

<script lang="ts">
import { AUTH_ERROR_MESSAGES } from '@/constants/appConstants'
import { SensitiveOperationService } from '@/services/sensitiveOperationService'
import { useToastService } from '@/services/toastService'
import { defineComponent, onMounted, onUnmounted, ref, computed, watch } from 'vue'

export default defineComponent({
  name: 'TOTPOperationDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'Security Verification Required'
    }
  },
  emits: ['update:modelValue', 'verified', 'canceled'],
  setup(props, { emit }) {
    const visible = ref(props.modelValue)
    const code = ref('')
    const error = ref('')
    const verifying = ref(false)
    const timeRemaining = ref(60)
    const maxAttempts = 3
    let countdownInterval: number | null = null
    const { handleError, handleWarning } = useToastService()
    const currentAttempts = ref(SensitiveOperationService.getTOTPAttempts())

    // Compute remaining attempts from reactive reference
    const globalAttemptsRemaining = computed(() => {
      return Math.max(0, maxAttempts - currentAttempts.value)
    })

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`
    }

    // Start countdown timer when dialog opens
    const startCountdown = () => {
      // First check if TOTP is locked out
      if (SensitiveOperationService.isTOTPLockedOut()) {
        const remainingTime = SensitiveOperationService.getTOTPLockoutRemainingTime()
        const minutes = Math.ceil(remainingTime / 60000)

        handleWarning(
          `TOTP verification is currently locked. Please try again in ${minutes} minutes.`,
          'Verification Locked'
        )
        cancel()
        return
      }

      // Update attempts count when dialog opens
      currentAttempts.value = SensitiveOperationService.getTOTPAttempts()

      if (countdownInterval) {
        clearInterval(countdownInterval)
      }

      timeRemaining.value = 60
      countdownInterval = window.setInterval(() => {
        if (timeRemaining.value <= 0) {
          // Time's up, cancel operation
          clearInterval(countdownInterval!)
          handleTimeout()
        } else {
          timeRemaining.value--
        }
      }, 1000)
    }

    // Handle timeout expiration
    const handleTimeout = () => {
      handleWarning(
        'TOTP verification time expired. The operation has been canceled.',
        'Verification Timeout'
      )
      cancel()
    }

    // Keep the dialog visibility in sync with the v-model
    watch(
      () => props.modelValue,
      (newValue) => {
        visible.value = newValue
        if (newValue) {
          // Reset state when dialog opens
          code.value = ''
          error.value = ''
          startCountdown()
        } else if (countdownInterval) {
          clearInterval(countdownInterval)
        }
      }
    )

    watch(visible, (newValue) => {
      emit('update:modelValue', newValue)
      if (!newValue && countdownInterval) {
        clearInterval(countdownInterval)
      }
    })

    const verify = async () => {
      if (code.value.length !== 6) {
        error.value = 'Please enter a 6-digit code'
        return
      }

      error.value = ''
      verifying.value = true

      try {
        const result = await SensitiveOperationService.verifyOperationTOTP(code.value)
        if (result) {
          if (countdownInterval) {
            clearInterval(countdownInterval)
          }
          visible.value = false
          emit('verified')
        }
      } catch (err: any) {
        error.value = AUTH_ERROR_MESSAGES.TOTP_INVALID

        // Update attempts count after failure
        currentAttempts.value = SensitiveOperationService.getTOTPAttempts()

        // Special handling for lockout errors
        if (err.errorType === 'TOTP_LOCKED_OUT') {
          const remainingTime = SensitiveOperationService.getTOTPLockoutRemainingTime()
          const minutes = Math.ceil(remainingTime / 60000)

          handleWarning(
            `TOTP verification is now locked. Please try again in ${minutes} minutes.`,
            'Verification Locked'
          )
          setTimeout(() => cancel(), 1500)
        } else {
          handleError(err, AUTH_ERROR_MESSAGES.TOTP_INVALID)

          // Check if we just hit max attempts
          if (SensitiveOperationService.isTOTPLockedOut()) {
            handleWarning(
              'Maximum verification attempts reached. TOTP is now locked for 15 minutes.',
              'Verification Failed'
            )
            setTimeout(() => cancel(), 1500)
          }
        }
      } finally {
        verifying.value = false
      }
    }

    const cancel = () => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
      visible.value = false
      emit('canceled')
      code.value = ''
      error.value = ''
    }

    // Reset error when code changes
    watch(code, () => {
      error.value = ''
    })

    // Clean up interval on component unmount
    onUnmounted(() => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
    })

    // Initialize countdown if dialog is open on mount
    onMounted(() => {
      if (visible.value) {
        startCountdown()
      }
    })

    return {
      visible,
      code,
      error,
      verifying,
      verify,
      cancel,
      timeRemaining,
      formatTime,
      globalAttemptsRemaining,
      maxAttempts
    }
  }
})
</script>

<style scoped>
.totp-verification {
  padding: 1rem;
}

.code-input-container {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.p-input-text {
  font-size: 1.25rem;
  text-align: center;
  letter-spacing: 0.5rem;
  font-family: monospace;
}

.p-error {
  display: block;
  text-align: center;
}

.countdown-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1rem 0;
  padding: 0.5rem;
  background-color: rgba(0, 128, 0, 0.1);
  border-radius: 4px;
}

.countdown-wrapper.warning {
  background-color: rgba(255, 0, 0, 0.1);
  color: #ff4d4d;
}

.countdown-label {
  margin-right: 0.5rem;
}

.countdown-timer {
  font-weight: bold;
  font-family: monospace;
}

.attempts-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.attempts-wrapper.warning {
  color: #ff4d4d;
  font-weight: bold;
}

.attempts-label {
  margin-right: 0.5rem;
}

.attempts-counter {
  font-weight: bold;
}

.lockout-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1rem 0;
  padding: 0.75rem;
  background-color: rgba(255, 0, 0, 0.1);
  border-radius: 4px;
  color: #ff4d4d;
  font-size: 0.9rem;
  text-align: center;
}

.lockout-warning i {
  margin-right: 0.5rem;
  font-size: 1.2rem;
}
</style>
