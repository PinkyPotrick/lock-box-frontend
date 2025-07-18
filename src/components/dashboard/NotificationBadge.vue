<!-- filepath: d:\Development\LockBox\lock-box-frontend\src\components\common\NotificationBadge.vue -->
<template>
  <div class="notification-badge-container" @click="toggleNotificationPanel">
    <p-toast />
    <i class="pi pi-bell notification-icon"></i>
    <p-badge v-if="unreadCount > 0" :value="badgeValue" severity="danger"></p-badge>

    <p-overlay
      v-model:visible="showPanel"
      target=".notification-badge-container"
      :showCloseIcon="true"
      @hide="showPanel = false"
    >
      <div class="notification-panel">
        <div class="notification-panel-header">
          <h3>Notifications</h3>
          <p-button
            v-if="recentNotifications.length > 0"
            label="Mark All Read"
            class="p-button-text p-button-sm"
            @click="markAllAsRead"
          />
        </div>

        <div class="notification-list" v-if="recentNotifications.length > 0">
          <div
            v-for="notification in recentNotifications"
            :key="notification.id"
            class="notification-item"
            :class="{ 'notification-unread': notification.status === 'UNREAD' }"
            @click="viewNotification(notification)"
          >
            <div class="notification-priority">
              <span :class="getPriorityClass(notification.priority)"></span>
            </div>
            <div class="notification-content">
              <div class="notification-title">
                {{ notification.title }}
                <span v-if="notification.status === 'UNREAD'" class="unread-dot"></span>
              </div>
              <div class="notification-message">
                {{ getTruncatedMessage(notification.message) }}
              </div>
              <div class="notification-time">{{ formatRelativeTime(notification.createdAt) }}</div>
            </div>
          </div>
        </div>

        <div class="notification-empty" v-else>
          <i class="pi pi-inbox empty-icon"></i>
          <p>No new notifications</p>
        </div>

        <div class="notification-panel-footer">
          <p-button
            label="View All Notifications"
            icon="pi pi-list"
            class="p-button-text"
            @click="navigateToNotifications"
          />
        </div>
      </div>
    </p-overlay>
  </div>
</template>

<script lang="ts">
import {
  NOTIFICATION_ERROR_MESSAGES,
  NOTIFICATION_SUCCESS_MESSAGES
} from '@/constants/appConstants'
import type { Notification } from '@/models/notification'
import { NotificationPriority, NotificationStatus } from '@/models/notification'
import { NotificationService } from '@/services/notificationService'
import { useToastService } from '@/services/toastService'
import { eventBus } from '@/utils/eventBus'
import moment from 'moment'
import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'NotificationBadge',
  setup() {
    const { handleError, handleSuccess } = useToastService()
    const router = useRouter()

    const unreadCount = ref(0)
    const showPanel = ref(false)
    const recentNotifications = ref<Notification[]>([])
    const loading = ref(false)
    const pollingInterval = ref<number | null>(null)
    const POLL_INTERVAL = 30000 // Poll every 30 seconds

    // Format the badge value to be more readable when > 99
    const badgeValue = computed(() => {
      return unreadCount.value > 99 ? '99+' : unreadCount.value.toString()
    })

    // Get notifications count
    const fetchUnreadCount = async () => {
      try {
        const count = await NotificationService.getUnreadCount()
        unreadCount.value = count
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }

    // Get recent notifications
    const fetchRecentNotifications = async () => {
      if (loading.value) return

      loading.value = true
      try {
        const result = await NotificationService.getNotifications(0, 5, NotificationStatus.UNREAD)
        recentNotifications.value = result.notifications
      } catch (error) {
        handleError(error, NOTIFICATION_ERROR_MESSAGES.FETCH_FAILED)
      } finally {
        loading.value = false
      }
    }

    // Toggle notification panel
    const toggleNotificationPanel = async () => {
      showPanel.value = !showPanel.value

      if (showPanel.value) {
        await fetchRecentNotifications()
      }
    }

    // Format relative time (e.g., "2 hours ago")
    const formatRelativeTime = (date: Date | string | number[] | null) => {
      if (!date) return 'N/A'

      let dateObj: Date

      if (date instanceof Date) {
        dateObj = date
      } else if (Array.isArray(date)) {
        const [year, month, day, hour, minute, second] = date
        dateObj = new Date(year, month - 1, day, hour, minute, second)
      } else {
        dateObj = new Date(date)
      }

      return moment(dateObj).fromNow()
    }

    // Truncate long messages
    const getTruncatedMessage = (message: string): string => {
      return message.length > 60 ? `${message.substring(0, 60)}...` : message
    }

    // Get CSS class for priority indicator
    const getPriorityClass = (priority: NotificationPriority): string => {
      const classMap: Record<string, string> = {
        [NotificationPriority.LOW]: 'priority-dot-low',
        [NotificationPriority.MEDIUM]: 'priority-dot-medium',
        [NotificationPriority.HIGH]: 'priority-dot-high',
        [NotificationPriority.CRITICAL]: 'priority-dot-critical'
      }
      return classMap[priority] || ''
    }

    // View notification details
    const viewNotification = (notification: Notification) => {
      // Close panel
      showPanel.value = false

      // Mark as read
      if (notification.status === NotificationStatus.UNREAD) {
        NotificationService.updateReadStatus([notification.id], true)
          .then(() => {
            unreadCount.value = Math.max(0, unreadCount.value - 1)

            // Emit event to update count elsewhere
            eventBus.emit('notification-count-updated', unreadCount.value)
          })
          .catch((error) => {
            console.error('Error marking notification as read:', error)
          })
      }

      // Navigate based on action link or go to notification details
      if (notification.actionLink) {
        if (notification.actionLink.startsWith('http')) {
          window.open(notification.actionLink, '_blank')
        } else {
          router.push(notification.actionLink)
        }
      } else {
        // Navigate to notification detail page
        router.push(`/dashboard/notifications?id=${notification.id}`)
      }
    }

    // Mark all notifications as read
    const markAllAsRead = async () => {
      try {
        await NotificationService.markAllAsRead()
        recentNotifications.value = []
        unreadCount.value = 0
        showPanel.value = false

        // Emit event to update counts elsewhere too
        eventBus.emit('notification-count-updated', 0)

        handleSuccess(NOTIFICATION_SUCCESS_MESSAGES.MARK_ALL_READ_SUCCESS)
      } catch (error) {
        handleError(error, NOTIFICATION_ERROR_MESSAGES.MARK_ALL_READ_FAILED)
      }
    }

    // Navigate to the notifications page
    const navigateToNotifications = () => {
      showPanel.value = false
      router.push('/dashboard/notifications')
    }

    // Start polling for unread count
    const startPolling = () => {
      fetchUnreadCount()
      pollingInterval.value = window.setInterval(fetchUnreadCount, POLL_INTERVAL)
    }

    // Stop polling
    const stopPolling = () => {
      if (pollingInterval.value) {
        clearInterval(pollingInterval.value)
        pollingInterval.value = null
      }
    }

    onMounted(() => {
      fetchUnreadCount()
      startPolling()

      // Listen for notification count updates from other components
      eventBus.on('notification-count-updated', (count: number) => {
        unreadCount.value = count
      })
    })

    onUnmounted(() => {
      stopPolling()
      eventBus.off('notification-count-updated', () => {})
    })

    return {
      unreadCount,
      showPanel,
      recentNotifications,
      badgeValue,
      toggleNotificationPanel,
      formatRelativeTime,
      getTruncatedMessage,
      getPriorityClass,
      viewNotification,
      markAllAsRead,
      navigateToNotifications
    }
  }
})
</script>

<style scoped>
.notification-badge-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0.5rem;
}

.notification-icon {
  font-size: 1.2rem;
  color: var(--text-color-secondary);
}

:deep(.p-badge) {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(25%, -25%);
}

.notification-panel {
  width: 350px;
  max-height: 80vh;
  background-color: var(--surface-overlay);
  border-radius: 8px;
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.16),
    0 3px 6px rgba(0, 0, 0, 0.23);
  display: flex;
  flex-direction: column;
}

.notification-panel-header {
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-panel-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.notification-list {
  overflow-y: auto;
  max-height: 400px;
}

.notification-item {
  display: flex;
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: var(--surface-hover);
}

.notification-unread {
  background-color: var(--surface-100);
}

.notification-priority {
  width: 12px;
  display: flex;
  align-items: center;
  margin-right: 10px;
}

.priority-dot-low,
.priority-dot-medium,
.priority-dot-high,
.priority-dot-critical {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.priority-dot-low {
  background-color: var(--surface-500);
}

.priority-dot-medium {
  background-color: var(--blue-500);
}

.priority-dot-high {
  background-color: var(--orange-500);
}

.priority-dot-critical {
  background-color: var(--red-500);
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--primary-color);
}

.notification-message {
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
}

.notification-empty {
  padding: 2rem;
  text-align: center;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.notification-panel-footer {
  padding: 1rem;
  border-top: 1px solid var(--surface-border);
  text-align: center;
}
</style>
