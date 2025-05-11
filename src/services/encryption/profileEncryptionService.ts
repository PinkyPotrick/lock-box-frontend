import { ERROR_TYPES, HTTP_STATUS, PROFILE_ERROR_MESSAGES } from '@/constants/appConstants'
import { decryptWithAESCBC } from '@/utils/encryptionUtils'
import { ApiError } from '../apiErrorService'

/**
 * Interface for encrypted data in AES-CBC format
 */
export interface EncryptedDataAesCbc {
  encryptedDataBase64: string
  ivBase64: string
  hmacBase64: string
}

/**
 * Interface for profile response from server
 */
export interface ProfileResponse {
  username: string
  email: string
  createdAt: string | Date | number[]
  updatedAt?: string | Date | number[]
}

/**
 * Service for handling encryption/decryption operations specific to profile operations
 */
export class ProfileEncryptionService {
  /**
   * Decrypts profile response from the server
   *
   * @param encryptedUserProfile The encrypted profile data from server
   * @param helperAesKey AES key for decryption
   * @returns Decrypted user profile data
   */
  static decryptProfileResponse(
    encryptedUserProfile: EncryptedDataAesCbc,
    helperAesKey: string
  ): ProfileResponse {
    try {
      // Validate input data
      if (!encryptedUserProfile || !helperAesKey) {
        throw new ApiError(
          PROFILE_ERROR_MESSAGES.DECRYPT_PROFILE_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.VALIDATION_ERROR
        )
      }

      // Decrypt the profile data using the helper AES key
      const decryptedProfileJson = this.decryptWithAES(encryptedUserProfile, helperAesKey)

      // Parse the JSON string to get the profile object
      const profileData = JSON.parse(decryptedProfileJson)

      // Format dates for consistency
      if (profileData.createdAt) {
        if (Array.isArray(profileData.createdAt)) {
          profileData.createdAt = this.parseLocalDateTime(profileData.createdAt)
        } else if (typeof profileData.createdAt === 'string') {
          profileData.createdAt = new Date(profileData.createdAt)
        }
      }

      if (profileData.updatedAt) {
        if (Array.isArray(profileData.updatedAt)) {
          profileData.updatedAt = this.parseLocalDateTime(profileData.updatedAt)
        } else if (typeof profileData.updatedAt === 'string') {
          profileData.updatedAt = new Date(profileData.updatedAt)
        }
      }

      return profileData
    } catch (error) {
      console.error('Failed to decrypt profile data:', error)
      throw new ApiError(
        PROFILE_ERROR_MESSAGES.DECRYPT_PROFILE_FAILED,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_TYPES.ENCRYPTION_ERROR
      )
    }
  }

  /**
   * Decrypts data from the encrypted object structure using AES-CBC
   *
   * @param encryptedObj The encrypted object containing data, IV and HMAC
   * @param aesKey The AES key to use for decryption
   * @returns Decrypted data as string
   */
  static decryptWithAES(encryptedObj: EncryptedDataAesCbc, aesKey: string): string {
    // Check if the encrypted object and required properties exist
    if (
      !encryptedObj ||
      typeof encryptedObj.encryptedDataBase64 !== 'string' ||
      typeof encryptedObj.ivBase64 !== 'string' ||
      typeof encryptedObj.hmacBase64 !== 'string'
    ) {
      console.warn('Invalid encrypted object provided for decryption:', encryptedObj)
      return '' // Return empty string instead of throwing an error
    }

    try {
      return decryptWithAESCBC(
        encryptedObj.encryptedDataBase64,
        encryptedObj.ivBase64,
        encryptedObj.hmacBase64,
        aesKey
      )
    } catch (error) {
      console.error('Error during decryption:', error)
      throw new ApiError(
        PROFILE_ERROR_MESSAGES.DECRYPT_PROFILE_FAILED,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_TYPES.ENCRYPTION_ERROR
      )
    }
  }

  /**
   * Parses LocalDateTime array from Java backend to JavaScript Date
   * @param dateTimeArray Array from Java's LocalDateTime [year, month, day, hour, minute, second, nano]
   * @returns JavaScript Date object
   */
  private static parseLocalDateTime(dateTimeArray: number[]): Date {
    if (!dateTimeArray || !Array.isArray(dateTimeArray)) {
      return new Date()
    }

    const [year, month, day, hour, minute, second, nano] = dateTimeArray
    // Note: JavaScript months are 0-based, so subtract 1 from the month
    return new Date(year, month - 1, day, hour, minute, second, nano / 1000000)
  }
}
