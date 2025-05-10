import axios from '@/axios-config'
import { DashboardEncryptionService } from './encryption/dashboardEncryptionService'
import { getAuthToken } from '@/stores/authStore'
import { API_PATHS } from '@/constants/apiPaths'

export class DashboardService {
  /**
   * Fetches overview statistics data from the server
   * @returns encrypted overview data response
   */
  static async fetchOverviewData() {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    const response = await axios.get(API_PATHS.DASHBOARD.OVERVIEW, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return response?.data?.item
  }

  /**
   * Fetches login history data from the server
   * @returns processed login history data response
   */
  static async fetchLoginHistoryData() {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    const response = await axios.get(API_PATHS.DASHBOARD.LOGIN_HISTORY, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return response?.data?.item
  }

  /**
   * Gets the overview statistics (vaults, domains, credentials count)
   * @returns Overview statistics object
   */
  static async getOverviewStats() {
    try {
      const { encryptedOverview, helperAesKey } = await this.fetchOverviewData()
      return DashboardEncryptionService.decryptOverviewResponse(encryptedOverview, helperAesKey)
    } catch (error) {
      console.error('Failed to fetch overview statistics:', error)
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

      // Extract statistics
      const { failureCount, successCount, totalCount, loginHistories } = loginHistoryResponse

      // Create stats object
      const stats = {
        failureCount,
        successCount,
        totalCount
      }

      // Process each encrypted history entry
      const decryptedHistories = await Promise.all(
        loginHistories.map((item: { encryptedLoginHistory: any; helperAesKey: any }) => {
          const { encryptedLoginHistory, helperAesKey } = item
          return DashboardEncryptionService.decryptLoginHistoryResponse(
            encryptedLoginHistory,
            helperAesKey
          )
        })
      )

      // Return both statistics and decrypted history entries
      return {
        stats,
        entries: decryptedHistories
      }
    } catch (error) {
      console.error('Failed to fetch login history:', error)
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
