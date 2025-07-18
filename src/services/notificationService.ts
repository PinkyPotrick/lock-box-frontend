import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'
import {
  DEFAULTS,
  ERROR_TYPES,
  GENERIC_ERROR_MESSAGES,
  HTTP_STATUS,
  NOTIFICATION_ERROR_MESSAGES
} from '@/constants/appConstants'
import type {
  Notification,
  NotificationPriority,
  NotificationStatus,
  NotificationType
} from '@/models/notification'
import { getAuthToken } from '@/stores/authStore'
import { ApiError, ApiErrorService } from './apiErrorService'
import {
  NotificationEncryptionService,
  type NotificationListResponseDTO,
  type NotificationResponseDTO
} from './encryption/notificationEncryptionService'

/**
 * Service for handling notification operations
 */
export class NotificationService {
  /**
   * Fetches notifications with filtering and pagination
   *
   * @param params Query parameters for filtering and pagination
   * @returns Notification list response
   */
  static async fetchNotifications({
    page = 0,
    size = DEFAULTS.PAGE_SIZE,
    status,
    type,
    priority
  }: {
    page?: number
    size?: number
    status?: NotificationStatus
    type?: NotificationType
    priority?: NotificationPriority
  }) {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      // Build query parameters
      const params: Record<string, any> = { page, size }

      if (status) {
        params.status = status
      }

      if (type) {
        params.type = type
      }

      if (priority) {
        params.priority = priority
      }

      // Make API call
      const response = await axios.get<{
        item: NotificationListResponseDTO
        success: boolean
        message?: string
      }>(API_PATHS.NOTIFICATIONS.BASE, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || NOTIFICATION_ERROR_MESSAGES.FETCH_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      return response?.data?.item
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Fetches unread notification count
   *
   * @returns Unread notification count
   */
  static async fetchUnreadCount() {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      // Make API call
      const response = await axios.get<{
        item: { unreadCount: number }
        success: boolean
        message?: string
      }>(API_PATHS.NOTIFICATIONS.UNREAD_COUNT, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || NOTIFICATION_ERROR_MESSAGES.FETCH_UNREAD_COUNT_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      return response?.data?.item.unreadCount
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Fetches a specific notification by ID
   *
   * @param id Notification ID
   * @returns Notification response
   */
  static async fetchNotificationById(id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const response = await axios.get<{
        item: NotificationResponseDTO
        success: boolean
        message?: string
      }>(`${API_PATHS.NOTIFICATIONS.BASE}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || `${NOTIFICATION_ERROR_MESSAGES.FETCH_NOTIFICATION_FAILED} ${id}`,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      return response?.data?.item
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Updates read status for notifications
   *
   * @param notificationIds Array of notification IDs to update
   * @param markAsRead Whether to mark as read (true) or unread (false)
   */
  static async updateReadStatus(notificationIds: string[], markAsRead: boolean) {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const response = await axios.put<{
        success: boolean
        message?: string
      }>(
        API_PATHS.NOTIFICATIONS.READ_STATUS,
        {
          notificationIds,
          markAsRead
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || NOTIFICATION_ERROR_MESSAGES.UPDATE_STATUS_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Marks all notifications as read
   */
  static async markAllAsRead() {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const response = await axios.put<{
        success: boolean
        message?: string
      }>(API_PATHS.NOTIFICATIONS.MARK_ALL_READ, null, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || NOTIFICATION_ERROR_MESSAGES.MARK_ALL_READ_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Deletes a notification
   *
   * @param id Notification ID to delete
   */
  static async deleteNotification(id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const response = await axios.delete<{
        success: boolean
        message?: string
      }>(`${API_PATHS.NOTIFICATIONS.BASE}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || `${NOTIFICATION_ERROR_MESSAGES.DELETE_FAILED} ${id}`,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Gets notifications with filtering and pagination and decrypts them
   *
   * @param page Page number (0-based)
   * @param size Page size
   * @param status Status filter
   * @param type Type filter
   * @param priority Priority filter
   * @returns Decrypted notifications and total count
   */
  static async getNotifications(
    page = 0,
    size = DEFAULTS.PAGE_SIZE,
    status?: NotificationStatus,
    type?: NotificationType,
    priority?: NotificationPriority
  ): Promise<{ notifications: Notification[]; totalCount: number }> {
    try {
      // Fetch the notifications from the server
      const response = await this.fetchNotifications({
        page,
        size,
        status,
        type,
        priority
      })

      if (response && Array.isArray(response.notifications)) {
        // Decrypt the notifications
        const decryptedNotifications = NotificationEncryptionService.decryptNotifications(
          response.notifications
        )

        return {
          notifications: decryptedNotifications,
          totalCount: response.totalCount
        }
      }

      return {
        notifications: [],
        totalCount: 0
      }
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Gets a specific notification by ID and decrypts it
   *
   * @param id Notification ID
   * @returns Decrypted notification
   */
  static async getNotificationById(id: string): Promise<Notification> {
    try {
      const response = await this.fetchNotificationById(id)

      if (!response) {
        throw new ApiError(
          NOTIFICATION_ERROR_MESSAGES.NOTIFICATION_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND_ERROR
        )
      }

      return NotificationEncryptionService.decryptNotification(response)
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Gets the count of unread notifications
   *
   * @returns Unread notification count
   */
  static async getUnreadCount(): Promise<number> {
    try {
      return await this.fetchUnreadCount()
    } catch (error) {
      console.error('Failed to fetch unread notification count:', error)
      return 0
    }
  }
}
