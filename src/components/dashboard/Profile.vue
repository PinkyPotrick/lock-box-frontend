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
import axios from '@/axios-config'
import moment from 'moment'
import { getCookies } from '@/utils/cookiesUtils'

export default defineComponent({
  setup() {
    const user = ref<User>({
      username: '',
      email: '',
      createdAt: ''
    })

    // Fetch and decrypt user profile data
    const fetchUserProfile = async () => {
      try {
        const cookies = getCookies()
        const response = await axios.get(`/api/users/profile`, {
          headers: {
            Authorization: `Bearer ${cookies.get('auth_token')}`
          }
        })
        console.log(response) // TODO delete this console.log !!!

        user.value = response.data
        // const decryptedData = decrypt(response.data)
        // user.value = JSON.parse(decryptedData)
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
