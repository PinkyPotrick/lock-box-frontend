<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="profile">
    <h2>User Profile</h2>
    <p-card>
      <template #header>
        <div class="profile-header">
          <i class="pi pi-user profile-icon"></i>
        </div>
      </template>
      <template #content>
        <div class="profile-content" v-if="loading">
          <p-progress-spinner style="width: 50px" strokeWidth="4" />
          <span class="loading-text">Loading profile data...</span>
        </div>
        <div class="profile-content" v-else>
          <div class="profile-field"><strong>Username:</strong> {{ user.username }}</div>
          <div class="profile-field"><strong>Email:</strong> {{ user.email }}</div>
          <div class="profile-field">
            <strong>Member Since:</strong> {{ formatDate(user.createdAt) }}
          </div>
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

export default defineComponent({
  setup() {
    const loading = ref(true)
    const authStore = useAuthStore()

    // Initialize user with data from authStore
    const user = ref<User>({
      username: authStore.user?.username || '',
      email: '',
      createdAt: ''
    })

    const fetchUserProfile = async () => {
      try {
        loading.value = true
        const profileData = await ProfileService.fetchUserProfile()

        // Update the user with the fetched data
        user.value = {
          ...user.value,
          ...profileData,
          username: user.value.username
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
      } finally {
        loading.value = false
      }
    }

    const formatDate = (dateString: string) => {
      if (!dateString) return 'N/A'
      return moment(dateString).format('MMMM D, YYYY')
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
}

.profile-header {
  display: flex;
  align-items: center;
}

.profile-icon {
  font-size: 2rem;
  margin-right: 0.5rem;
  padding: 2rem;
}

.profile-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-text {
  margin-top: 1rem;
}

.profile-field {
  margin-bottom: 1rem;
  width: 100%;
}
</style>
