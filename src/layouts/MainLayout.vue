<template>
  <div class="layout-wrapper">
    <SidePanel />
    <div class="layout-main-container">
      <div v-if="showSecurityNotice && !isLoadingProfile" class="security-notice">
        <i class="pi pi-shield"></i>
        <div class="notice-content">
          <h4>Enhance Your Account Security</h4>
          <p>Set up two-factor authentication to add an extra layer of security to your account.</p>
          <p-button label="Set up 2FA" icon="pi pi-lock" class="p-button-sm" @click="goToProfile">
          </p-button>
        </div>
        <p-button
          icon="pi pi-times"
          class="p-button-text p-button-rounded p-button-sm close-btn"
          @click="dismissNotice"
          aria-label="Dismiss"
        >
        </p-button>
      </div>

      <div class="layout-main">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import SidePanel from '@/layouts/SidePanel.vue'
import { ProfileService } from '@/services/profileService'
import { useAuthStore } from '@/stores/authStore'
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  components: {
    SidePanel
  },
  setup() {
    const authStore = useAuthStore()
    const router = useRouter()
    const isLoggedIn = ref(false)
    const userProfile = ref<{ totpEnabled: boolean }>({ totpEnabled: false })
    const securityNoticeDismissed = ref(false)
    const isLoadingProfile = ref(true)

    // More reactive computed property to ensure it updates
    const showSecurityNotice = computed(() => {
      return (
        isLoggedIn.value &&
        userProfile.value &&
        userProfile.value.totpEnabled === false &&
        !securityNoticeDismissed.value
      )
    })

    // Watch for changes in auth status
    watch(
      () => authStore.isLoggedIn,
      (newValue) => {
        isLoggedIn.value = newValue
        if (newValue) {
          refreshProfileStatus()
        }
      }
    )

    const refreshProfileStatus = async () => {
      if (isLoggedIn.value) {
        try {
          isLoadingProfile.value = true

          // Clear notice dismissed flag when refreshing to ensure we check the current status
          const profile = await ProfileService.fetchUserProfile()
          userProfile.value = { totpEnabled: profile.totpEnabled ?? false }

          // Add a small delay before showing the notice
          setTimeout(() => {
            isLoadingProfile.value = false
          }, 1000)
        } catch (error) {
          console.error('Failed to fetch profile:', error)
          isLoadingProfile.value = false
        }
      } else {
        isLoadingProfile.value = false
      }
    }

    onMounted(async () => {
      isLoggedIn.value = authStore.isLoggedIn

      if (isLoggedIn.value) {
        // Check if notice was previously dismissed
        securityNoticeDismissed.value = localStorage.getItem('2fa_notice_dismissed') === 'true'

        // Fetch user profile to check TOTP status
        await refreshProfileStatus()
      } else {
        isLoadingProfile.value = false // Reset loading if not logged in
      }
    })

    const goToProfile = () => {
      router.push('/profile')
    }

    const dismissNotice = () => {
      securityNoticeDismissed.value = true
      localStorage.setItem('2fa_notice_dismissed', 'true')
    }

    // Add event listener for TOTP status changes
    onMounted(() => {
      window.addEventListener('totp-status-changed', refreshProfileStatus)
    })

    // Clean up event listener when component is unmounted
    onUnmounted(() => {
      window.removeEventListener('totp-status-changed', refreshProfileStatus)
    })

    return {
      isLoggedIn,
      userProfile,
      showSecurityNotice,
      isLoadingProfile, // Expose loading state to template
      goToProfile,
      dismissNotice,
      refreshProfileStatus
    }
  }
})
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  height: 92vh;
}

.layout-main-container {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  position: relative;
}

.security-notice {
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: rgba(255, 165, 0, 0.1);
  border-left: 4px solid #ffa500;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  position: relative;
}

.security-notice i {
  color: #ffa500;
  font-size: 1.5rem;
}

.notice-content {
  flex: 1;
}

.notice-content h4 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}

.notice-content p {
  margin: 0 0 0.75rem;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

.close-btn {
  padding: 0.25rem;
  height: 2rem;
  width: 2rem;
}

@media (max-width: 768px) {
  .security-notice {
    flex-direction: column;
    align-items: flex-start;
  }

  .close-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
  }
}
</style>
