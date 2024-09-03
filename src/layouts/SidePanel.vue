<template>
  <p-panel class="side-panel" header="LockBox">
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
import { defineComponent, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/axios-config'
import { getCookies } from '@/utils/cookies'
import { useAuthStore } from '@/stores/auth'

export default defineComponent({
  setup() {
    const router = useRouter()
    const unseenCount = ref<number>(0)

    const fetchUnseenNotifications = async () => {
      try {
        const response = await axios.get<number>('/api/notifications/unseen-count')
        unseenCount.value = response.data
      } catch (error) {
        console.error('Failed to fetch unseen notifications count:', error)
      }
    }

    const handleLogout = () => {
      const cookies = getCookies()
      cookies?.remove('auth_token')
      router.push({ name: 'Login' })
      const authStore = useAuthStore()
      authStore.clearAuthToken()
    }

    onMounted(() => {
      fetchUnseenNotifications()
    })

    return {
      unseenCount,
      handleLogout
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
</style>
