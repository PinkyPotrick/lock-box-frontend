import type {
  Notification,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  ResourceType
} from '@/models/notification'
import { decryptWithAESCBC } from '@/utils/encryptionUtils'

/**
 * Interface for encrypted data in AES-CBC format
 */
export interface EncryptedDataAesCbcDTO {
  encryptedDataBase64: string
  ivBase64: string
  hmacBase64: string
}

/**
 * Interface for notification response from server
 */
export interface NotificationResponseDTO {
  id: string
  userId: string
  type: NotificationType
  encryptedTitle: EncryptedDataAesCbcDTO
  encryptedMessage: EncryptedDataAesCbcDTO
  encryptedResourceId: EncryptedDataAesCbcDTO
  resourceType: ResourceType
  priority: NotificationPriority
  status: NotificationStatus
  createdAt: string | number[]
  readAt: string | number[] | null
  encryptedActionLink: EncryptedDataAesCbcDTO
  encryptedMetadata: EncryptedDataAesCbcDTO
  sentViaEmail: boolean
  helperAesKey: string
}

/**
 * Interface for notification list response from server
 */
export interface NotificationListResponseDTO {
  notifications: NotificationResponseDTO[]
  totalCount: number
}

/**
 * Service for handling encryption/decryption operations specific to notification management
 */
export class NotificationEncryptionService {
  /**
   * Decrypts a notification response from the server
   *
   * @param notificationResponse Encrypted notification response from server
   * @returns Decrypted notification data
   */
  static decryptNotification(notificationResponse: NotificationResponseDTO): Notification {
    const {
      id,
      userId,
      type,
      encryptedTitle,
      encryptedMessage,
      encryptedResourceId,
      resourceType,
      priority,
      status,
      createdAt,
      readAt,
      encryptedActionLink,
      encryptedMetadata,
      sentViaEmail,
      helperAesKey
    } = notificationResponse

    try {
      // Decrypt the fields using the helper AES key
      const title = this.tryDecryptField(encryptedTitle, helperAesKey)
      const message = this.tryDecryptField(encryptedMessage, helperAesKey)
      const resourceId = this.tryDecryptField(encryptedResourceId, helperAesKey)
      const actionLink = this.tryDecryptField(encryptedActionLink, helperAesKey)
      const metadata = this.tryDecryptField(encryptedMetadata, helperAesKey)

      // Return the decrypted notification data
      return {
        id,
        userId,
        type,
        title,
        message,
        resourceId,
        resourceType,
        priority,
        status,
        createdAt: this.safeParseDate(createdAt),
        readAt: readAt ? this.safeParseDate(readAt) : null,
        actionLink,
        metadata,
        sentViaEmail
      }
    } catch (error) {
      console.error('Failed to decrypt notification:', error)
      throw new Error('Failed to decrypt notification data')
    }
  }

  /**
   * Decrypts multiple notifications from a list response
   *
   * @param notificationResponses Array of notification responses from server
   * @returns Array of decrypted notifications
   */
  static decryptNotifications(notificationResponses: NotificationResponseDTO[]): Notification[] {
    return notificationResponses.map((notification) => this.decryptNotification(notification))
  }

  /**
   * Try to decrypt a field if it exists and has valid structure
   *
   * @param encryptedObj The encrypted object containing data, IV and HMAC
   * @param aesKey The AES key to use for decryption
   * @returns Decrypted data as string or empty string if decryption fails
   */
  private static tryDecryptField(encryptedObj?: EncryptedDataAesCbcDTO, aesKey?: string): string {
    // Check if the encrypted object and key exist
    if (
      !encryptedObj ||
      !aesKey ||
      !encryptedObj.encryptedDataBase64 ||
      !encryptedObj.ivBase64 ||
      !encryptedObj.hmacBase64
    ) {
      return ''
    }

    try {
      return decryptWithAESCBC(
        encryptedObj.encryptedDataBase64,
        encryptedObj.ivBase64,
        encryptedObj.hmacBase64,
        aesKey
      )
    } catch (error) {
      console.warn('Error decrypting field:', error)
      return ''
    }
  }

  /**
   * Safely parse a date from the API which can come either as string or array
   *
   * @param dateData Date data from API (can be string or array)
   * @returns Valid Date object
   */
  private static safeParseDate(dateData: string | any[]): Date {
    // If no data provided, return current date
    if (!dateData) return new Date()

    try {
      // Check if the date is an array format [year, month, day, hour, minute, second, nanosecond]
      if (Array.isArray(dateData) && dateData.length >= 6) {
        // JavaScript months are 0-indexed (0=January, 11=December)
        // But our array data uses 1-indexed months, so we subtract 1
        const [year, month, day, hour, minute, second] = dateData

        // Create date from components
        const date = new Date(year, month - 1, day, hour, minute, second)

        console.debug('Parsed array date:', dateData, 'to:', date.toISOString())
        return date
      }

      // Handle string format
      if (typeof dateData === 'string') {
        const date = new Date(dateData)
        // Check if date is valid
        if (isNaN(date.getTime())) {
          console.warn('Invalid string date format from API:', dateData)
          return new Date()
        }
        return date
      }

      // If we get here, the format is unknown
      console.warn('Unknown date format received from API:', dateData)
      return new Date()
    } catch (error) {
      console.warn('Error parsing date:', error, dateData)
      return new Date()
    }
  }
}
