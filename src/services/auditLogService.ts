import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'
import {
  AUDIT_ERROR_MESSAGES,
  DEFAULTS,
  ERROR_TYPES,
  GENERIC_ERROR_MESSAGES,
  HTTP_STATUS
} from '@/constants/appConstants'
import { getAuthToken } from '@/stores/authStore'
import { ApiError, ApiErrorService } from './apiErrorService'
import type { AuditLog, AuditLogListResponseDTO } from './encryption/auditLogEncryptionService'
import { AuditLogEncryptionService } from './encryption/auditLogEncryptionService'

/**
 * Service for handling audit log operations
 */
export class AuditLogService {
  /**
   * Fetches audit logs with filtering and pagination
   *
   * @param params Query parameters for filtering and pagination
   * @returns Audit log list response
   */
  static async fetchAuditLogs({
    page = 0,
    size = DEFAULTS.PAGE_SIZE,
    operationType = 'ALL',
    level = 'ALL',
    startDate,
    endDate
  }: {
    page?: number
    size?: number
    operationType?: string
    level?: string
    startDate?: string
    endDate?: string
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

      if (operationType && operationType !== 'ALL') {
        params.operationType = operationType
      }

      if (level && level !== 'ALL') {
        params.level = level
      }

      if (startDate) {
        params.startDate = startDate
      }

      if (endDate) {
        params.endDate = endDate
      }

      // Make API call
      const response = await axios.get<{
        item: AuditLogListResponseDTO
        success: boolean
        message?: string
      }>(API_PATHS.AUDIT.LOGS, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || AUDIT_ERROR_MESSAGES.FETCH_LOGS_FAILED,
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
   * Gets audit logs with filtering and pagination and decrypts them
   *
   * @param params Query parameters for filtering and pagination
   * @returns Decrypted audit logs and total count
   */
  static async getAuditLogs({
    page = 0,
    size = DEFAULTS.PAGE_SIZE,
    operationType = 'ALL',
    level = 'ALL',
    startDate,
    endDate
  }: {
    page?: number
    size?: number
    operationType?: string
    level?: string
    startDate?: string
    endDate?: string
  }): Promise<{ auditLogs: AuditLog[]; totalCount: number }> {
    try {
      // Fetch the audit logs from the server
      const response = await this.fetchAuditLogs({
        page,
        size,
        operationType,
        level,
        startDate,
        endDate
      })

      if (response && Array.isArray(response.auditLogs)) {
        // Decrypt the audit logs
        const decryptedAuditLogs = AuditLogEncryptionService.decryptAuditLogs(response.auditLogs)

        return {
          auditLogs: decryptedAuditLogs,
          totalCount: response.totalCount
        }
      }

      return {
        auditLogs: [],
        totalCount: 0
      }
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }
}
