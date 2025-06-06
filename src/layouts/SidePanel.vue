<template>
  <p-panel class="side-panel no-header">
    <div class="welcome-container" v-if="isLoggedIn">
      <p class="welcome-message">Welcome back, {{ username }}!</p>
    </div>
    <p-divider v-if="isLoggedIn"></p-divider>
    <ul>
      <li class="side-panel-item">
        <router-link to="/overview" active-class="active">
          <i class="pi pi-chart-bar"></i>
          <span>Overview</span>
        </router-link>
      </li>
      <li class="side-panel-item">
        <router-link to="/profile" active-class="active">
          <i class="pi pi-user"></i>
          <span>Profile</span></router-link
        >
      </li>
      <li class="side-panel-item">
        <router-link to="/vaults" active-class="active">
          <i class="pi pi-lock"></i>
          <span class="label">Vaults</span></router-link
        >
      </li>
      <li class="side-panel-item">
        <router-link to="/domains" active-class="active">
          <i class="pi pi-globe"></i>
          <span class="label">Domains</span></router-link
        >
      </li>
      <li class="side-panel-item">
        <router-link to="/notifications" active-class="active">
          <i class="pi pi-bell"></i>
          <span>Notifications</span>
          <p-badge :value="unseenCount" v-if="unseenCount > 0" severity="secondary"></p-badge
        ></router-link>
      </li>
      <li class="side-panel-item">
        <router-link to="/audit" active-class="active">
          <i class="pi pi-book"></i>
          <span>Audit</span></router-link
        >
      </li>
      <li class="side-panel-item" @click="handleLogout">Logout</li>
    </ul>
  </p-panel>
</template>

<script lang="ts">
import { handleLogout } from '@/services/authService'
import { NotificationService } from '@/services/notificationService'
import { useAuthStore } from '@/stores/authStore'
import { getCookies } from '@/utils/cookiesUtils'
import { eventBus } from '@/utils/eventBus'
import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()

    // Get auth state from store
    const isLoggedIn = computed(() => authStore.isLoggedIn)
    const username = computed(() => authStore.currentUsername || 'User')

    // Track unseen notifications count
    const unseenCount = ref(0)

    // Set up polling interval
    const pollingInterval = ref<number | null>(null)
    const POLL_INTERVAL = 30000 // Poll every 30 seconds

    // Fetch unseen notifications count
    const fetchUnseenNotifications = async () => {
      // Only fetch if user is logged in
      if (!isLoggedIn.value) return

      try {
        const count = await NotificationService.getUnreadCount()
        unseenCount.value = count
      } catch (error) {
        console.error('Failed to fetch unread notification count:', error)
        // Don't update count on error to avoid resetting to 0 erroneously
      }
    }

    // Start polling for notification count
    const startPolling = () => {
      // Initial fetch
      fetchUnseenNotifications()

      // Set up interval for periodic updates
      pollingInterval.value = window.setInterval(fetchUnseenNotifications, POLL_INTERVAL)
    }

    // Stop polling
    const stopPolling = () => {
      if (pollingInterval.value) {
        clearInterval(pollingInterval.value)
        pollingInterval.value = null
      }
    }

    // Handle logout click
    const handleLogoutClick = async () => {
      try {
        stopPolling() // Stop polling on logout
        await handleLogout()
        router.push('/login')
      } catch (error) {
        // Even if server-side logout fails, clear local state
        const cookies = getCookies()
        cookies.remove('auth_token')
        authStore.logout()
        router.push('/login')
      }
    }

    onMounted(() => {
      if (isLoggedIn.value) {
        startPolling()

        // Listen for notification count updates from other components
        eventBus.on('notification-count-updated', (count: number) => {
          unseenCount.value = count
        })
      }
    })

    // Clean up on component unmount
    onUnmounted(() => {
      stopPolling()
      eventBus.off('notification-count-updated', () => {})
    })

    return {
      unseenCount,
      handleLogout: handleLogoutClick,
      isLoggedIn,
      username
    }
  }
})
</script>

<style scoped>
.side-panel {
  width: 300px;
  border-radius: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;

  ul {
    list-style: none;
    padding: 0;
  }
}

:deep(.p-panel-header) {
  display: none;
}

.side-panel-item {
  width: 100%;
  font-size: large;
  padding: 0.75rem;
  border-radius: 0.5rem;

  &:hover {
    background-color: #34d39913;
  }

  i {
    margin-right: 1rem;
  }

  a {
    display: inline-block;
    text-decoration: none;
    color: inherit;
    width: 100%;
  }

  .p-badge {
    margin-left: 10px;
  }

  .active {
    color: var(--p-primary-color);
  }
}

.side-panel li:last-child {
  margin-top: auto;
  cursor: pointer;
  color: var(--logout-text);
}

.welcome-container {
  padding: 10px 0;
}

.welcome-message {
  margin: 0;
  font-weight: bold;
}
</style>
