<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="notifications">
    <p-toast />
    <h2>Notifications</h2>

    <div class="filter-container">
      <!-- Type Filter with Label -->
      <div class="filter-item-with-label">
        <label class="filter-label">Type</label>
        <p-select
          v-model="selectedType"
          :options="notificationTypeOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All Types"
          class="filter-item"
        ></p-select>
      </div>

      <!-- Priority Filter with Label -->
      <div class="filter-item-with-label">
        <label class="filter-label">Priority</label>
        <p-select
          v-model="selectedPriority"
          :options="notificationPriorityOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All Priorities"
          class="filter-item"
        ></p-select>
      </div>

      <!-- Status Filter with Label -->
      <div class="filter-item-with-label">
        <label class="filter-label">Status</label>
        <p-select
          v-model="selectedStatus"
          :options="notificationStatusOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All Statuses"
          class="filter-item"
        ></p-select>
      </div>
    </div>

    <!-- Button container for filter buttons -->
    <div class="button-container">
      <div class="filter-actions">
        <p-button class="p-button-sm" @click="applyFilters">
          <i class="pi pi-filter mr-2"></i>
          Filter
        </p-button>
        <p-button class="p-button-sm p-button-secondary" @click="resetFilters">
          <i class="pi pi-refresh mr-2"></i>
          Reset
        </p-button>
      </div>

      <div class="bulk-actions">
        <p-button
          class="p-button-sm p-button-success"
          @click="markAllAsRead"
          :disabled="!hasUnreadItems"
        >
          <i class="pi pi-check mr-2"></i>
          Mark All as Read
        </p-button>
      </div>
    </div>

    <p-data-table
      :value="notifications"
      :paginator="true"
      :rows="rows"
      v-model:first="first"
      :rowsPerPageOptions="[5, 10, 20, 50]"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      :currentPageReportTemplate="'{first} to {last} of {totalRecords} notifications'"
      :loading="loading"
      :emptyMessage="loading ? 'Loading notifications...' : 'No notifications found'"
      dataKey="id"
      :totalRecords="totalRecords"
      @page="onPageChange"
      v-model:sortField="sortField"
      v-model:sortOrder="sortOrder"
      :lazy="false"
      @sort="onSortChange"
      class="notification-table"
      stripedRows
      responsiveLayout="scroll"
      v-model:selection="selectedNotifications"
      :rowClass="getRowClass"
    >
      <template #header>
        <div class="table-header-content">
          <p-button
            v-if="selectedNotifications.length > 0"
            class="p-button-sm p-button-info mr-2"
            @click="markSelectedAsRead"
          >
            <i class="pi pi-check mr-2"></i>
            Mark Selected as Read
          </p-button>
          <p-button
            v-if="selectedNotifications.length > 0"
            class="p-button-sm p-button-danger"
            @click="confirmDeleteSelected"
          >
            <i class="pi pi-trash mr-2"></i>
            Delete Selected
          </p-button>
        </div>
      </template>

      <p-column selectionMode="multiple" headerStyle="width: 3rem"></p-column>

      <p-column field="priority" header="Priority" :sortable="true" style="width: 8rem">
        <template #body="{ data }">
          <span class="priority-badge" :class="getPriorityClass(data.priority)">
            {{ data.priority }}
          </span>
        </template>
      </p-column>

      <p-column field="title" header="Title" :sortable="true">
        <template #body="{ data }">
          <div class="notification-title">
            <span :class="{ unread: data.status === 'UNREAD' }">{{ data.title }}</span>
            <p-badge v-if="data.status === 'UNREAD'" class="unread-badge" value=" "></p-badge>
          </div>
        </template>
      </p-column>

      <p-column field="message" header="Message">
        <template #body="{ data }">
          <div class="notification-message">{{ getTruncatedMessage(data.message) }}</div>
        </template>
      </p-column>

      <p-column field="type" header="Type" :sortable="true" style="width: 10rem">
        <template #body="{ data }">
          <p-tag :value="formatType(data.type)" :severity="getTypeSeverity(data.type)"></p-tag>
        </template>
      </p-column>

      <p-column field="createdAt" header="Received" :sortable="true" style="width: 10rem">
        <template #body="{ data }">
          <span :title="formatDateTime(data.createdAt)">{{
            formatRelativeTime(data.createdAt)
          }}</span>
        </template>
      </p-column>

      <p-column style="width: 8rem">
        <template #body="{ data }">
          <div class="notification-actions">
            <p-button
              icon="pi pi-eye"
              class="p-button-sm p-button-rounded p-button-text"
              @click="viewNotificationDetails(data)"
              v-tooltip.top="'View details'"
            />
            <p-button
              :icon="data.status === 'UNREAD' ? 'pi pi-check' : 'pi pi-undo'"
              class="p-button-sm p-button-rounded p-button-text"
              @click="toggleReadStatus(data)"
              v-tooltip.top="data.status === 'UNREAD' ? 'Mark as read' : 'Mark as unread'"
            />
            <p-button
              icon="pi pi-trash"
              class="p-button-sm p-button-rounded p-button-text p-button-danger"
              @click="confirmDelete(data)"
              v-tooltip.top="'Delete'"
            />
          </div>
        </template>
      </p-column>
    </p-data-table>

    <!-- Notification Details Dialog -->
    <p-dialog
      header="Notification Details"
      v-model:visible="showDetailsDialog"
      :modal="true"
      :closable="true"
      class="notification-details-dialog"
      :style="{ width: '700px' }"
    >
      <div v-if="selectedNotification" class="details-content">
        <div class="detail-section">
          <div class="notification-header">
            <span class="priority-badge" :class="getPriorityClass(selectedNotification.priority)">
              {{ selectedNotification.priority }}
            </span>
            <h3>{{ selectedNotification.title }}</h3>
          </div>
          <div class="notification-metadata">
            <span class="metadata-item">
              <i class="pi pi-calendar mr-2"></i>
              {{ formatDateTime(selectedNotification.createdAt) }}
            </span>
            <span class="metadata-item">
              <i class="pi pi-tag mr-2"></i>
              {{ formatType(selectedNotification.type) }}
            </span>
          </div>
          <div class="notification-body">
            <p>{{ selectedNotification.message }}</p>
          </div>
        </div>

        <div class="detail-section" v-if="selectedNotification.resourceId">
          <h4>Related Resource</h4>
          <div class="detail-row">
            <div class="detail-label">Type:</div>
            <div class="detail-value">
              {{ formatResourceType(selectedNotification.resourceType) }}
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-label">ID:</div>
            <div class="detail-value">{{ selectedNotification.resourceId }}</div>
          </div>
        </div>

        <div class="detail-section" v-if="selectedNotification.metadata">
          <h4>Additional Information</h4>
          <div class="notification-metadata-content">
            {{ selectedNotification.metadata }}
          </div>
        </div>
      </div>
      <div v-else class="details-content">
        <p>Loading notification details...</p>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <p-button
            v-if="selectedNotification && selectedNotification.actionLink"
            label="Go to Related Item"
            icon="pi pi-external-link"
            @click="navigateToActionLink(selectedNotification.actionLink)"
            class="p-button-primary mr-2"
          />
          <p-button
            v-if="selectedNotification"
            :label="selectedNotification.status === 'UNREAD' ? 'Mark as Read' : 'Mark as Unread'"
            :icon="selectedNotification.status === 'UNREAD' ? 'pi pi-check' : 'pi pi-undo'"
            @click="toggleReadStatus(selectedNotification)"
            class="p-button-secondary mr-2"
          />
          <p-button
            label="Close"
            icon="pi pi-times"
            @click="showDetailsDialog = false"
            class="p-button-text"
          />
        </div>
      </template>
    </p-dialog>

    <!-- Confirm Delete Dialog -->
    <p-confirm-dialog></p-confirm-dialog>
  </div>
</template>

<script lang="ts">
import {
  DEFAULTS,
  NOTIFICATION_ERROR_MESSAGES,
  NOTIFICATION_SUCCESS_MESSAGES
} from '@/constants/appConstants'
import type { Notification, ResourceType } from '@/models/notification'
import { NotificationPriority, NotificationStatus, NotificationType } from '@/models/notification'
import { NotificationService } from '@/services/notificationService'
import { useToastService } from '@/services/toastService'
import { eventBus } from '@/utils/eventBus'
import moment from 'moment'
import Tooltip from 'primevue/tooltip'
import { useConfirm } from 'primevue/useconfirm'
import { computed, defineComponent, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  directives: {
    tooltip: Tooltip
  },
  setup() {
    const { handleError, handleSuccess } = useToastService()
    const confirm = useConfirm()
    const router = useRouter()

    // Options for filters
    const notificationTypeOptions = [
      { value: 'ALL', label: 'All Types' },
      { value: NotificationType.SECURITY_ALERT, label: 'Security Alert' },
      { value: NotificationType.ACCOUNT, label: 'Account' },
      { value: NotificationType.CONTENT, label: 'Content' },
      { value: NotificationType.SYSTEM, label: 'System' },
      { value: NotificationType.PROMOTIONAL, label: 'Promotional' }
    ]

    const notificationPriorityOptions = [
      { value: 'ALL', label: 'All Priorities' },
      { value: NotificationPriority.LOW, label: 'Low' },
      { value: NotificationPriority.MEDIUM, label: 'Medium' },
      { value: NotificationPriority.HIGH, label: 'High' },
      { value: NotificationPriority.CRITICAL, label: 'Critical' }
    ]

    const notificationStatusOptions = [
      { value: 'ALL', label: 'All Statuses' },
      { value: NotificationStatus.READ, label: 'Read' },
      { value: NotificationStatus.UNREAD, label: 'Unread' }
    ]

    // Data
    const notifications = ref<Notification[]>([])
    const totalRecords = ref(0)
    const loading = ref(false)
    const selectedNotification = ref<Notification | null>(null)
    const showDetailsDialog = ref(false)
    const selectedNotifications = ref<Notification[]>([])
    const initialLoadComplete = ref(false)

    // Pagination & Sorting
    const first = ref(0)
    const rows = ref(10)
    const sortField = ref('createdAt')
    const sortOrder = ref(-1) // descending by default
    const currentPage = ref(0)

    // Filters - These are sent directly to backend
    const selectedType = ref('ALL')
    const selectedPriority = ref('ALL')
    const selectedStatus = ref('ALL')

    // Computed property to check if there are unread items
    const hasUnreadItems = computed(() => {
      return notifications.value.some(
        (notification) => notification.status === NotificationStatus.UNREAD
      )
    })

    // Format date for display
    const formatDateTime = (date: Date | number[] | string | null): string => {
      if (!date) return 'N/A'

      try {
        // If it's already a Date object
        if (date instanceof Date) {
          return moment(date).format('YYYY-MM-DD HH:mm:ss')
        }

        // If it's an array format [year, month, day, hour, minute, second, nanosecond]
        if (Array.isArray(date) && date.length >= 6) {
          const [year, month, day, hour, minute, second] = date
          // JavaScript months are 0-indexed (0=January, 11=December)
          const jsDate = new Date(year, month - 1, day, hour, minute, second)
          return moment(jsDate).format('YYYY-MM-DD HH:mm:ss')
        }

        // If it's a string, parse it
        if (typeof date === 'string') {
          return moment(date).format('YYYY-MM-DD HH:mm:ss')
        }

        console.warn('Unhandled date format:', date)
        return 'Invalid date'
      } catch (error) {
        console.warn('Error formatting date:', date, error)
        return 'Invalid date'
      }
    }

    // Format relative time (e.g., "2 hours ago")
    const formatRelativeTime = (date: Date | number[] | string | null): string => {
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

    const formatType = (type: NotificationType): string => {
      return type
        .replace('_', ' ')
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }

    const formatResourceType = (type: ResourceType): string => {
      return type.charAt(0) + type.slice(1).toLowerCase()
    }

    const getTruncatedMessage = (message: string): string => {
      return message.length > 80 ? `${message.substring(0, 80)}...` : message
    }

    // Style methods
    const getTypeSeverity = (type: NotificationType): string => {
      const severityMap: Record<string, string> = {
        [NotificationType.SECURITY_ALERT]: 'danger',
        [NotificationType.ACCOUNT]: 'warning',
        [NotificationType.CONTENT]: 'info',
        [NotificationType.SYSTEM]: 'secondary',
        [NotificationType.PROMOTIONAL]: 'success'
      }
      return severityMap[type] || 'info'
    }

    const getPriorityClass = (priority: NotificationPriority): string => {
      const classMap: Record<string, string> = {
        [NotificationPriority.LOW]: 'priority-low',
        [NotificationPriority.MEDIUM]: 'priority-medium',
        [NotificationPriority.HIGH]: 'priority-high',
        [NotificationPriority.CRITICAL]: 'priority-critical'
      }
      return classMap[priority] || ''
    }

    const getRowClass = (data: Notification) => {
      return {
        'notification-unread': data.status === NotificationStatus.UNREAD,
        'notification-priority-critical': data.priority === NotificationPriority.CRITICAL
      }
    }

    // Load notifications from backend with filters applied
    const fetchNotifications = async () => {
      loading.value = true
      initialLoadComplete.value = false

      try {
        // Get all notifications with backend filters but handle pagination on frontend
        const result = await NotificationService.getNotifications(
          0, // Always get the first page
          DEFAULTS.LARGE_PAGE_SIZE, // Use large page size to get all items
          selectedStatus.value !== 'ALL' ? (selectedStatus.value as NotificationStatus) : undefined,
          selectedType.value !== 'ALL' ? (selectedType.value as NotificationType) : undefined,
          selectedPriority.value !== 'ALL'
            ? (selectedPriority.value as NotificationPriority)
            : undefined
        )

        notifications.value = result.notifications
        totalRecords.value = result.totalCount
        initialLoadComplete.value = true
      } catch (error) {
        handleError(error, NOTIFICATION_ERROR_MESSAGES.FETCH_FAILED)
        notifications.value = []
        totalRecords.value = 0
      } finally {
        loading.value = false
      }
    }

    // Apply filters and reload notifications
    const applyFilters = () => {
      first.value = 0
      currentPage.value = 0
      fetchNotifications()
    }

    // Reset filters
    const resetFilters = () => {
      selectedType.value = 'ALL'
      selectedPriority.value = 'ALL'
      selectedStatus.value = 'ALL'
      first.value = 0
      currentPage.value = 0
      fetchNotifications()
    }

    // Handle page change
    const onPageChange = (event: any) => {
      first.value = event.first
      rows.value = event.rows
      currentPage.value = Math.floor(event.first / event.rows)
      // No need to fetch data again - we're using client-side pagination
    }

    // Handle sort change - refetch with new sort
    const onSortChange = (event: any) => {
      sortField.value = event.sortField
      sortOrder.value = event.sortOrder
      fetchNotifications()
    }

    // View notification details
    const viewNotificationDetails = (notification: Notification) => {
      selectedNotification.value = notification
      showDetailsDialog.value = true

      // Mark as read if it's unread
      if (notification.status === NotificationStatus.UNREAD) {
        toggleReadStatus(notification)
      }
    }

    // Toggle read status for a notification
    const toggleReadStatus = async (notification: Notification) => {
      try {
        const markAsRead = notification.status === NotificationStatus.UNREAD
        await NotificationService.updateReadStatus([notification.id], markAsRead)

        // Update local state
        notification.status = markAsRead ? NotificationStatus.READ : NotificationStatus.UNREAD

        // Emit event to update notification count elsewhere
        const unreadCount = notifications.value.filter(
          (n) => n.status === NotificationStatus.UNREAD
        ).length
        eventBus.emit('notification-count-updated', unreadCount)

        // Show success message
        handleSuccess(
          markAsRead
            ? NOTIFICATION_SUCCESS_MESSAGES.MARK_READ_SUCCESS
            : NOTIFICATION_SUCCESS_MESSAGES.MARK_UNREAD_SUCCESS
        )
      } catch (error) {
        handleError(error, NOTIFICATION_ERROR_MESSAGES.UPDATE_STATUS_FAILED)
      }
    }

    // Mark all notifications as read
    const markAllAsRead = async () => {
      try {
        loading.value = true
        await NotificationService.markAllAsRead()

        // Update all notifications in our local list
        notifications.value.forEach((notification) => {
          notification.status = NotificationStatus.READ
        })

        // Emit event that count is now zero
        eventBus.emit('notification-count-updated', 0)

        handleSuccess(NOTIFICATION_SUCCESS_MESSAGES.MARK_ALL_READ_SUCCESS)
      } catch (error) {
        handleError(error, NOTIFICATION_ERROR_MESSAGES.MARK_ALL_READ_FAILED)
      } finally {
        loading.value = false
      }
    }

    // Mark selected notifications as read
    const markSelectedAsRead = async () => {
      if (selectedNotifications.value.length === 0) return

      try {
        const unreadIds = selectedNotifications.value
          .filter((notification) => notification.status === NotificationStatus.UNREAD)
          .map((notification) => notification.id)

        if (unreadIds.length === 0) {
          handleSuccess('No unread notifications selected')
          return
        }

        loading.value = true
        await NotificationService.updateReadStatus(unreadIds, true)

        // Update status in our local list
        unreadIds.forEach((id) => {
          const notification = notifications.value.find((n) => n.id === id)
          if (notification) {
            notification.status = NotificationStatus.READ
          }
        })

        // Calculate new unread count and emit event
        const unreadCount = notifications.value.filter(
          (n) => n.status === NotificationStatus.UNREAD
        ).length
        eventBus.emit('notification-count-updated', unreadCount)

        selectedNotifications.value = []
        handleSuccess(`${unreadIds.length} notification(s) marked as read`)
      } catch (error) {
        handleError(error, NOTIFICATION_ERROR_MESSAGES.UPDATE_STATUS_FAILED)
      } finally {
        loading.value = false
      }
    }

    // Confirm delete for a single notification
    const confirmDelete = (notification: Notification) => {
      confirm.require({
        message: 'Are you sure you want to delete this notification?',
        header: 'Delete Confirmation',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          deleteNotification(notification.id)
        }
      })
    }

    // Confirm delete for multiple notifications
    const confirmDeleteSelected = () => {
      if (selectedNotifications.value.length === 0) return

      confirm.require({
        message: `Are you sure you want to delete ${selectedNotifications.value.length} selected notification(s)?`,
        header: 'Delete Confirmation',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          deleteSelectedNotifications()
        }
      })
    }

    // Delete a single notification
    const deleteNotification = async (id: string) => {
      try {
        loading.value = true
        await NotificationService.deleteNotification(id)
        fetchNotifications()
        handleSuccess(NOTIFICATION_SUCCESS_MESSAGES.DELETE_SUCCESS)
      } catch (error) {
        handleError(error, NOTIFICATION_ERROR_MESSAGES.DELETE_FAILED)
      } finally {
        loading.value = false
      }
    }

    // Delete selected notifications
    const deleteSelectedNotifications = async () => {
      try {
        loading.value = true
        const deletePromises = selectedNotifications.value.map((notification) =>
          NotificationService.deleteNotification(notification.id)
        )
        await Promise.all(deletePromises)
        selectedNotifications.value = []
        fetchNotifications()
        handleSuccess(`${deletePromises.length} notification(s) deleted successfully`)
      } catch (error) {
        handleError(error, NOTIFICATION_ERROR_MESSAGES.DELETE_FAILED)
      } finally {
        loading.value = false
      }
    }

    // Navigate to action link
    const navigateToActionLink = (actionLink: string) => {
      // Check if it's an internal route or external URL
      if (actionLink.startsWith('http')) {
        window.open(actionLink, '_blank')
      } else {
        // For internal routes, close dialog and navigate
        showDetailsDialog.value = false
        router.push(actionLink)
      }
    }

    // Load initial data
    onMounted(() => {
      fetchNotifications()
    })

    return {
      // Data
      notifications,
      totalRecords,
      loading,
      selectedNotification,
      showDetailsDialog,
      selectedNotifications,
      notificationTypeOptions,
      notificationPriorityOptions,
      notificationStatusOptions,
      initialLoadComplete,

      // Computed
      hasUnreadItems,

      // Filters
      selectedType,
      selectedPriority,
      selectedStatus,

      // Pagination & Sorting
      first,
      rows,
      sortField,
      sortOrder,
      currentPage,

      // Methods
      formatDateTime,
      formatRelativeTime,
      formatType,
      formatResourceType,
      getTruncatedMessage,
      getTypeSeverity,
      getPriorityClass,
      getRowClass,
      fetchNotifications,
      applyFilters,
      resetFilters,
      onPageChange,
      onSortChange,
      viewNotificationDetails,
      toggleReadStatus,
      markAllAsRead,
      markSelectedAsRead,
      confirmDelete,
      confirmDeleteSelected,
      deleteNotification,
      deleteSelectedNotifications,
      navigateToActionLink
    }
  }
})
</script>

<style scoped>
.notifications {
  padding: 2rem;
}

.filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
  background-color: var(--surface-section);
  border-radius: 8px;
}

.button-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.bulk-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.filter-item {
  width: 100%;
}

.filter-item-with-label {
  min-width: 200px;
  width: calc(33.33% - 0.67rem);
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  margin-left: 0.25rem;
  color: var(--text-color-secondary);
}

:deep(.p-paginator-rpp-options) {
  width: 5rem !important;
  min-width: unset !important;
}

.notification-table {
  background-color: var(--surface-section);
  border-radius: 8px;
}

:deep(.p-datatable-header) {
  padding: 0.5rem;
}

.table-header-content {
  display: flex;
  align-items: center;

  .p-button {
    margin-right: 0.5rem;
  }
}

.notification-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 500;
}

.notification-title .unread {
  font-weight: 700;
}

.notification-message {
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

.notification-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.25rem;
}

.priority-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  display: inline-block;
  min-width: 70px;
  text-align: center;
}

.priority-low {
  background-color: #e9ecef;
  color: #6c757d;
}

.priority-medium {
  background-color: #cfe2ff;
  color: #084298;
}

.priority-high {
  background-color: #ffbe89;
  color: #642e05;
}

.priority-critical {
  background-color: #ffe2e2;
  color: #b91c1c;
}

.unread-badge {
  width: 8px !important;
  height: 8px !important;
  border-radius: 50%;
  background-color: var(--primary-color);
}

:deep(.notification-unread) {
  background-color: var(--surface-100) !important;
}

:deep(.notification-priority-critical) {
  border-left: 4px solid var(--red-500);
}

.notification-details-dialog {
  max-width: 700px;
}

.notification-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.notification-header h3 {
  margin: 0;
  flex: 1;
}

.notification-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

.metadata-item {
  display: flex;
  align-items: center;

  .pi {
    margin-right: 0.25rem;
    color: var(--text-color-secondary);
  }
}

.notification-body {
  line-height: 1.5;
}

.details-content {
  padding: 0 1rem;
}

.detail-section {
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--surface-300);
  padding-bottom: 1rem;
}

.detail-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0;
}

.detail-section h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
  color: var(--text-color);
}

.detail-row {
  display: flex;
  margin-bottom: 0.75rem;
}

.detail-label {
  width: 30%;
  min-width: 100px;
  font-weight: bold;
  color: var(--text-color-secondary);
}

.detail-value {
  flex: 1;
  word-break: break-word;
}

.notification-metadata-content {
  background-color: var(--surface-ground);
  padding: 1rem;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;

  .p-button {
    margin-left: 1rem;
  }
}

@media (max-width: 768px) {
  .filter-container {
    flex-direction: column;
  }

  .filter-item-with-label {
    width: 100%;
    margin-bottom: 0.5rem;
  }

  .button-container {
    flex-direction: column;
    gap: 1rem;
  }

  .notification-metadata {
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-row {
    flex-direction: column;
  }

  .detail-label {
    width: 100%;
    margin-bottom: 0.25rem;
  }
}
</style>
