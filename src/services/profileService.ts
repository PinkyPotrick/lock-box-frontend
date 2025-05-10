import axios from '@/axios-config'
import { ProfileEncryptionService } from './encryption/profileEncryptionService'
import type { User } from '@/models/user'
import { getAuthToken } from '@/stores/authStore'
import { API_PATHS } from '@/constants/apiPaths'

export class ProfileService {
  /**
   * Fetches the user profile data from the server
   * @returns encrypted profile data response
   */
  static async fetchProfileData() {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    const response = await axios.get(API_PATHS.USERS.PROFILE, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return response?.data?.item
  }

  /**
   * Fetches the user's profile from the server
   *
   * @returns User profile information
   */
  static async fetchUserProfile(): Promise<User> {
    try {
      const { encryptedUserProfile, helperAesKey } = await this.fetchProfileData()

      const decryptedProfileData = ProfileEncryptionService.decryptProfileResponse(
        encryptedUserProfile,
        helperAesKey
      )

      return {
        username: decryptedProfileData.username,
        email: decryptedProfileData.email,
        createdAt: decryptedProfileData.createdAt
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      throw error
    }
  }
}
