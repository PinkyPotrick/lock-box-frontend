<template>
  <div class="verification-view">
    <div class="verification-container">
      <div class="brand">
        <h1>LockBox</h1>
      </div>

      <div class="countdown-timer" :class="{ warning: timeRemaining < 30 }">
        <i class="pi pi-clock"></i>
        <span>{{ formatTimeRemaining }}</span>
      </div>

      <TOTPVerification :sessionId="sessionId" @verified="onVerified"></TOTPVerification>

      <div class="back-link">
        <p-button
          @click="goBack"
          icon="pi pi-arrow-left"
          label="Back to login"
          class="p-button-text p-button-secondary"
          size="small"
        ></p-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { TOTPService } from '@/services/totpService'
import TOTPVerification from '@/components/auth/TOTPVerification.vue'
import { defineComponent, onMounted, onUnmounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  components: {
    TOTPVerification
  },
  setup() {
    const router = useRouter()
    const sessionId = ref('')
    const timeRemaining = ref(60) // 1 minute in seconds
    let countdownInterval: number | null = null

    const formatTimeRemaining = computed(() => {
      const minutes = Math.floor(timeRemaining.value / 60)
      const seconds = timeRemaining.value % 60
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
    })

    const startCountdown = () => {
      // Get expiry time from session storage
      const expiryTime = parseInt(sessionStorage.getItem('totp_expiry') || '0', 10)
      const currentTime = Date.now()

      // Calculate initial remaining time in seconds
      timeRemaining.value = Math.max(0, Math.floor((expiryTime - currentTime) / 1000))

      countdownInterval = window.setInterval(() => {
        if (timeRemaining.value <= 0) {
          // Time's up, redirect to login
          clearInterval(countdownInterval!)
          TOTPService.cleanupTOTPSessionData()
          router.push({
            path: '/login',
            query: { expired: 'true' }
          })
        } else {
          timeRemaining.value--
        }
      }, 1000)
    }

    onMounted(() => {
      const totpSessionId = sessionStorage.getItem('totp_session_id')
      if (!totpSessionId) {
        router.push('/login')
        return
      }

      sessionId.value = totpSessionId
      startCountdown()
    })

    onUnmounted(() => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
    })

    const onVerified = () => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
    }

    const goBack = () => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }

      TOTPService.cleanupTOTPSessionData()

      router.push('/login')
    }

    return {
      sessionId,
      timeRemaining,
      formatTimeRemaining,
      onVerified,
      goBack
    }
  }
})
</script>

<style scoped>
.verification-view {
  min-height: 92vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--surface-ground);
  padding: 1rem;
}

.verification-container {
  background-color: var(--surface-card);
  padding: 2rem;
  width: 100%;
  max-width: 450px;
}

.brand {
  text-align: center;
  margin-bottom: 1.5rem;
}

.brand h1 {
  font-size: 2rem;
  margin: 0;
  color: var(--primary-color);
}

/* Countdown timer styling */
.countdown-timer {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  color: var(--text-color);
  padding: 0.5rem;
  border-radius: 4px;
  background-color: rgba(0, 128, 0, 0.1);
}

.countdown-timer.warning {
  background-color: rgba(255, 0, 0, 0.1);
  color: #ff4d4d;
}

.countdown-timer i {
  margin-right: 0.5rem;
}

.back-link {
  margin-top: 2rem;
  text-align: center;
}

:deep(.p-button.p-button-text) {
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  padding: 0.75rem 1.25rem;
}

:deep(.p-button.p-button-text:hover) {
  background-color: rgba(255, 255, 255, 0.04);
  color: var(--text-color);
}

:deep(.p-button .p-button-icon) {
  margin-right: 0.4rem;
}
</style>
