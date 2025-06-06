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
 * Interface for audit log response from server
 */
export interface AuditLogResponseDTO {
  id: string
  userId: string
  timestamp: string
  actionType: string
  operationType: 'READ' | 'WRITE' | 'UPDATE' | 'DELETE'
  logLevel: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  actionStatus: string
  ipAddress: string
  clientInfo: string
  failureReason: string
  encryptedResourceId: EncryptedDataAesCbcDTO
  encryptedResourceName: EncryptedDataAesCbcDTO
  encryptedAdditionalInfo: EncryptedDataAesCbcDTO
  helperAesKey: string
}

/**
 * Interface for audit log list response from server
 */
export interface AuditLogListResponseDTO {
  auditLogs: AuditLogResponseDTO[]
  totalCount: number
}

/**
 * Interface for decrypted audit log data
 */
export interface AuditLog {
  id: string
  userId: string
  timestamp: Date
  actionType: string
  operationType: 'READ' | 'WRITE' | 'UPDATE' | 'DELETE'
  logLevel: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  actionStatus: string
  ipAddress: string
  clientInfo: string
  failureReason: string
  resourceId: string
  resourceName: string
  additionalInfo: string
}

/**
 * Service for handling encryption/decryption operations specific to audit log management
 */
export class AuditLogEncryptionService {
  /**
   * Decrypts an audit log response from the server
   *
   * @param auditLogResponse Encrypted audit log response from server
   * @returns Decrypted audit log data
   */
  static decryptAuditLog(auditLogResponse: AuditLogResponseDTO): AuditLog {
    const {
      id,
      userId,
      timestamp,
      actionType,
      operationType,
      logLevel,
      actionStatus,
      ipAddress,
      clientInfo,
      failureReason,
      encryptedResourceId,
      encryptedResourceName,
      encryptedAdditionalInfo,
      helperAesKey
    } = auditLogResponse

    try {
      // Decrypt the resource ID, name, and additional info
      const resourceId = this.tryDecryptField(encryptedResourceId, helperAesKey)
      const resourceName = this.tryDecryptField(encryptedResourceName, helperAesKey)
      const additionalInfo = this.tryDecryptField(encryptedAdditionalInfo, helperAesKey)

      // Debug the timestamp received
      console.debug('Processing audit log timestamp:', timestamp)

      // Return the decrypted audit log data with correctly parsed date
      return {
        id,
        userId,
        timestamp: this.safeParseDate(timestamp),
        actionType: actionType || 'UNKNOWN',
        operationType: operationType || 'READ',
        logLevel: logLevel || 'INFO',
        actionStatus: actionStatus || 'UNKNOWN',
        ipAddress: ipAddress || '',
        clientInfo: clientInfo || '',
        failureReason: failureReason || '',
        resourceId,
        resourceName,
        additionalInfo
      }
    } catch (error) {
      console.error('Failed to decrypt audit log:', error)
      throw new Error('Failed to decrypt audit log data')
    }
  }

  /**
   * Decrypts multiple audit logs from a list response
   *
   * @param auditLogResponses Array of audit log responses from server
   * @returns Array of decrypted audit logs
   */
  static decryptAuditLogs(auditLogResponses: AuditLogResponseDTO[]): AuditLog[] {
    return auditLogResponses.map((auditLog) => this.decryptAuditLog(auditLog))
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
