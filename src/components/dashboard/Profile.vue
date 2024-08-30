<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="profile">
    <h2>User Profile</h2>
    <p-card>
      <template #header>
        <div class="profile-header">
          <i class="pi pi-user profile-icon"></i>
          <span class="profile-title">{{ user.username }}</span>
        </div>
      </template>
      <template #content>
        <div class="profile-content">
          <div class="profile-field"><strong>Username:</strong> {{ user.username }}</div>
          <div class="profile-field"><strong>Email:</strong> {{ user.email }}</div>
          <div class="profile-field">
            <strong>Member Since:</strong> {{ formatDate(user.memberSince) }}
          </div>
          <div class="profile-field">
            <strong>Last Login:</strong> {{ formatDate(user.lastLogin) }}
          </div>
        </div>
      </template>
    </p-card>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import type { User } from '@/models/user'
import axios from '@/axios-config'
import moment from 'moment'

export default defineComponent({
  setup() {
    const user = ref<User>({
      username: '',
      email: '',
      memberSince: '',
      lastLogin: ''
    })

    const fetchUserProfile = async () => {
      try {
        const response = await axios.get<User>('/api/user/profile')
        user.value = response.data
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
      }
    }

    const formatDate = (dateString: string) => {
      return moment(dateString).format('MMMM dd, yyyy')
    }

    onMounted(() => {
      fetchUserProfile()
    })

    return {
      user,
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

.profile-title {
  font-size: 1.5rem;
  font-weight: bold;
}

.profile-content {
  margin-top: 1rem;
}

.profile-field {
  margin-bottom: 1rem;
}
</style>
