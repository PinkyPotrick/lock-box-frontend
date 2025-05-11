import axios from '@/axios-config'
import { ProfileEncryptionService } from './encryption/profileEncryptionService'
import type { User } from '@/models/user'
import { getAuthToken } from '@/stores/authStore'
import { API_PATHS } from '@/constants/apiPaths'
import {
  ERROR_TYPES,
  GENERIC_ERROR_MESSAGES,
  HTTP_STATUS,
  PROFILE_ERROR_MESSAGES
} from '@/constants/appConstants'
import { ApiError, ApiErrorService } from './apiErrorService'

/**
 * Service for handling user profile operations
 */
export class ProfileService {
  /**
   * Fetches the user profile data from the server
   * @returns encrypted profile data response
   */
  static async fetchProfileData() {
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
      }>(API_PATHS.USERS.PROFILE, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || PROFILE_ERROR_MESSAGES.FETCH_PROFILE_FAILED,
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
   * Fetches the user's profile from the server
   *
   * @returns User profile information
   */
  static async fetchUserProfile(): Promise<User> {
    try {
      const profileData = await this.fetchProfileData()

      if (!profileData || !profileData.encryptedUserProfile || !profileData.helperAesKey) {
        throw new ApiError(
          GENERIC_ERROR_MESSAGES.INVALID_SERVER_RESPONSE,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.API_ERROR
        )
      }

      const { encryptedUserProfile, helperAesKey } = profileData

      try {
        const decryptedProfileData = ProfileEncryptionService.decryptProfileResponse(
          encryptedUserProfile,
          helperAesKey
        )

        // Validate decrypted data
        if (!decryptedProfileData) {
          throw new ApiError(
            PROFILE_ERROR_MESSAGES.DECRYPT_PROFILE_FAILED,
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            ERROR_TYPES.API_ERROR
          )
        }

        const createdAt = Array.isArray(decryptedProfileData.createdAt)
          ? new Date(decryptedProfileData.createdAt[0])
          : decryptedProfileData.createdAt

        const updatedAt = Array.isArray(decryptedProfileData.updatedAt)
          ? new Date(decryptedProfileData.updatedAt[0])
          : decryptedProfileData.updatedAt

        return {
          // Including username property to satisfy the User interface
          username: decryptedProfileData.username || '',
          email: decryptedProfileData.email,
          createdAt,
          updatedAt
        }
      } catch (decryptError) {
        console.error(PROFILE_ERROR_MESSAGES.DECRYPT_PROFILE_FAILED, decryptError)
        throw new ApiError(
          PROFILE_ERROR_MESSAGES.DECRYPT_PROFILE_FAILED,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.API_ERROR
        )
      }
    } catch (error) {
      console.error(PROFILE_ERROR_MESSAGES.FETCH_PROFILE_FAILED, error)
      throw ApiErrorService.handleError(error)
    }
  }
}
