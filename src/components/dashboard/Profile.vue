<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="profile">
    <p-toast />
    <h2>User Profile</h2>

    <!-- Profile Information Card -->
    <p-card class="mb-4">
      <template #header>
        <div class="profile-header">
          <i class="pi pi-user profile-icon"></i>
          <h3>Profile Information</h3>
        </div>
      </template>
      <template #content>
        <div class="profile-content" v-if="loading">
          <p-progress-spinner style="width: 50px" strokeWidth="4" />
          <span class="loading-text">Loading profile data...</span>
        </div>
        <div class="profile-content" v-else>
          <div class="profile-field">
            <span class="field-label">Username:</span>
            <span class="field-value">{{ user.username }}</span>
          </div>
          <div class="profile-field">
            <span class="field-label">Email:</span>
            <span class="field-value">{{ user.email }}</span>
          </div>
          <div class="profile-field">
            <span class="field-label">Member Since:</span>
            <span class="field-value">{{ formatDate(user.createdAt) }}</span>
          </div>
          <div class="profile-field" v-if="user.updatedAt">
            <span class="field-label">Last Updated:</span>
            <span class="field-value">{{ formatDate(user.updatedAt) }}</span>
          </div>
        </div>
      </template>
    </p-card>

    <!-- Security Settings Card -->
    <p-card>
      <template #header>
        <div class="profile-header">
          <i class="pi pi-shield profile-icon"></i>
          <h3>Security Settings</h3>
        </div>
      </template>
      <template #content>
        <div class="security-content">
          <p>Manage your account security settings (coming soon)</p>
        </div>
      </template>
    </p-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import type { User } from '@/models/user'
import moment from 'moment'
import { useAuthStore } from '@/stores/authStore'
import { ProfileService } from '@/services/profileService'
import { useToastService } from '@/services/toastService'
import { DATE_FORMATS } from '@/constants/appConstants'

export default defineComponent({
  setup() {
    const loading = ref(true)
    const authStore = useAuthStore()
    const { handleError } = useToastService()

    // Initialize user with data from authStore
    const user = ref<User>({
      username: authStore.user?.username || '',
      email: '',
      createdAt: new Date().toISOString(),
      updatedAt: undefined
    })

    const fetchUserProfile = async () => {
      try {
        loading.value = true
        const profileData = await ProfileService.fetchUserProfile()

        user.value = {
          ...user.value,
          ...profileData,
          username: user.value.username
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
        handleError(error, 'Profile Error')
      } finally {
        loading.value = false
      }
    }

    const formatDate = (date: string | Date) => {
      if (!date) return 'N/A'
      return moment(date).format(DATE_FORMATS.DISPLAY_DATE)
    }

    onMounted(() => {
      fetchUserProfile()
    })

    return {
      user,
      loading,
      formatDate
    }
  }
})
</script>

<style scoped>
.profile {
  padding: 2rem;
  max-width: 100%;
  margin: 0 auto;
}

.profile-header {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: var(--surface-50);
  border-radius: 6px 6px 0 0;
}

.profile-icon {
  font-size: 1.5rem;
  margin-right: 1rem;
  color: var(--primary-color);
}

.profile-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.security-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.loading-text {
  margin-top: 1rem;
  color: var(--text-color-secondary);
}

.profile-field {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  border-bottom: 1px solid var(--surface-200);
  padding-bottom: 0.5rem;
}

.field-label {
  font-weight: 600;
  width: 150px;
  color: var(--text-color-secondary);
}

.field-value {
  flex: 1;
}

.mb-4 {
  margin-bottom: 1.5rem;
}

:deep(.p-card) {
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

:deep(.p-card .p-card-content) {
  padding: 0;
}

:deep(.p-progress-spinner) {
  margin: 0 auto;
}

h3 {
  margin: 0;
}
</style>
