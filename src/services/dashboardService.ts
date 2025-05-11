import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'
import {
  DASHBOARD_ERROR_MESSAGES,
  ERROR_TYPES,
  GENERIC_ERROR_MESSAGES,
  HTTP_STATUS
} from '@/constants/appConstants'
import { getAuthToken } from '@/stores/authStore'
import { ApiError, ApiErrorService } from './apiErrorService'
import { DashboardEncryptionService } from './encryption/dashboardEncryptionService'

/**
 * Service for handling dashboard operations and statistics
 */
export class DashboardService {
  /**
   * Fetches overview statistics data from the server
   * @returns encrypted overview data response
   */
  static async fetchOverviewData() {
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
        item: any
        success: boolean
        message?: string
      }>(API_PATHS.DASHBOARD.OVERVIEW, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || DASHBOARD_ERROR_MESSAGES.FETCH_OVERVIEW_FAILED,
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
   * Fetches login history data from the server
   * @returns processed login history data response
   */
  static async fetchLoginHistoryData() {
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
        item: any
        success: boolean
        message?: string
      }>(API_PATHS.DASHBOARD.LOGIN_HISTORY, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || DASHBOARD_ERROR_MESSAGES.FETCH_LOGIN_HISTORY_FAILED,
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
   * Gets the overview statistics (vaults, domains, credentials count)
   * @returns Overview statistics object
   */
  static async getOverviewStats() {
    try {
      const response = await this.fetchOverviewData()

      if (!response || !response.encryptedOverview || !response.helperAesKey) {
        throw new ApiError(
          GENERIC_ERROR_MESSAGES.INVALID_SERVER_RESPONSE,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.API_ERROR
        )
      }

      const { encryptedOverview, helperAesKey } = response

      try {
        return DashboardEncryptionService.decryptOverviewResponse(encryptedOverview, helperAesKey)
      } catch (decryptError) {
        console.error(DASHBOARD_ERROR_MESSAGES.DECRYPT_OVERVIEW_FAILED, decryptError)
        throw new ApiError(
          DASHBOARD_ERROR_MESSAGES.DECRYPT_OVERVIEW_FAILED,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.API_ERROR
        )
      }
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.FETCH_OVERVIEW_FAILED, error)

      // Provide default values for graceful degradation in UI
      if (error instanceof ApiError && error.errorType === ERROR_TYPES.API_ERROR) {
        throw error
      }

      return {
        vaultCount: 0,
        domainCount: 0,
        credentialCount: 0
      }
    }
  }

  /**
   * Gets the login history for chart display
   * @returns Array of login history data points
   */
  static async getLoginHistory() {
    try {
      const loginHistoryResponse = await this.fetchLoginHistoryData()

      if (!loginHistoryResponse || !Array.isArray(loginHistoryResponse.loginHistories)) {
        throw new ApiError(
          GENERIC_ERROR_MESSAGES.INVALID_SERVER_RESPONSE,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.API_ERROR
        )
      }

      // Extract statistics
      const {
        failureCount = 0,
        successCount = 0,
        totalCount = 0,
        loginHistories = []
      } = loginHistoryResponse

      // Create stats object
      const stats = {
        failureCount,
        successCount,
        totalCount
      }

      // Process each encrypted history entry
      try {
        const decryptedHistories = await Promise.all(
          loginHistories.map((item: { encryptedLoginHistory: any; helperAesKey: any }) => {
            const { encryptedLoginHistory, helperAesKey } = item
            if (!encryptedLoginHistory || !helperAesKey) {
              console.warn('Missing encryption data for a login history entry')
              return null
            }
            return DashboardEncryptionService.decryptLoginHistoryResponse(
              encryptedLoginHistory,
              helperAesKey
            )
          })
        )

        // Filter out any null values from failed decryption
        const validEntries = decryptedHistories.filter((entry) => entry !== null)

        // Return both statistics and decrypted history entries
        return {
          stats,
          entries: validEntries
        }
      } catch (decryptError) {
        console.error(DASHBOARD_ERROR_MESSAGES.DECRYPT_LOGIN_HISTORY_FAILED, decryptError)
        throw new ApiError(
          DASHBOARD_ERROR_MESSAGES.DECRYPT_LOGIN_HISTORY_FAILED,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.API_ERROR
        )
      }
    } catch (error) {
      console.error(DASHBOARD_ERROR_MESSAGES.FETCH_LOGIN_HISTORY_FAILED, error)

      // Provide default values for graceful degradation in UI
      if (error instanceof ApiError && error.errorType === ERROR_TYPES.API_ERROR) {
        throw error
      }

      return {
        stats: {
          failureCount: 0,
          successCount: 0,
          totalCount: 0
        },
        entries: []
      }
    }
  }
}
