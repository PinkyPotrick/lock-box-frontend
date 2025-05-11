<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="notifications">
    <p-toast />
    <h2>Notifications</h2>
    <p-data-table
      class="data-table-container"
      :value="notifications"
      paginator
      :rows="10"
      :emptyMessage="'No notifications found'"
    >
      <p-column field="message" header="Notification"></p-column>
      <p-column field="date" header="Date" :body="dateTemplate"></p-column>
      <p-column header="Actions">
        <template #body="slotProps">
          <p-button
            v-if="!slotProps.data.read"
            label="Mark as Read"
            icon="pi pi-check"
            @click="markAsRead(slotProps.data.id)"
          />
        </template>
      </p-column>
    </p-data-table>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import type { Notification } from './../../models/notification'
import axios from '@/axios-config'
import moment from 'moment'

export default defineComponent({
  setup() {
    const notifications = ref<Notification[]>([])

    const fetchNotifications = async () => {
      try {
        const response = await axios.get<Notification[]>('/api/notifications')
        notifications.value = response.data
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    const markAsRead = async (notificationId: string) => {
      try {
        await axios.patch(`/api/notifications/${notificationId}/read`)
        const notification = notifications.value.find((n) => n.id === notificationId)
        if (notification) {
          notification.read = true
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }

    const dateTemplate = (rowData: Notification) => {
      return moment(rowData.date).format('MMMM dd, yyyy')
    }

    onMounted(() => {
      fetchNotifications()
    })

    return {
      notifications,
      markAsRead,
      dateTemplate
    }
  }
})
</script>

<style scoped>
.notifications {
  padding: 2rem;
}
</style>
