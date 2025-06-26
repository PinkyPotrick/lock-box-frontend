import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'
import {
  AUTH_ERROR_MESSAGES,
  ERROR_TYPES,
  GENERIC_ERROR_MESSAGES,
  HTTP_STATUS,
  PROFILE_ERROR_MESSAGES
} from '@/constants/appConstants'
import type { TOTPSetupResponse, TOTPVerifyRequest } from '@/models/user'
import { getAuthToken } from '@/stores/authStore'
import { ApiError, ApiErrorService } from './apiErrorService'
import { completeAuthentication } from './authService'

/**
 * Service for handling TOTP (Time-based One-Time Password) operations
 */
export class TOTPService {
  /**
   * Initiates setup of TOTP 2FA for the user
   * @returns Setup data including secret and QR code URL
   */
  static async setupTOTP(): Promise<TOTPSetupResponse> {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const response = await axios.post<{
        item: TOTPSetupResponse
        success: boolean
        message?: string
      }>(API_PATHS.USERS.TOTP_SETUP, null, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || PROFILE_ERROR_MESSAGES.TOTP_SETUP_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      return response.data.item
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Verifies and activates TOTP 2FA with the provided code
   * @param code The verification code from the authenticator app
   * @returns Success status
   */
  static async verifyTOTP(code: string): Promise<boolean> {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const requestData: TOTPVerifyRequest = { code }
      const response = await axios.post<{
        item: boolean
        success: boolean
        message?: string
      }>(API_PATHS.USERS.TOTP_VERIFY, requestData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || PROFILE_ERROR_MESSAGES.TOTP_VERIFY_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      return response.data.item
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Disables TOTP 2FA for the user
   * @returns Success status
   */
  static async disableTOTP(): Promise<boolean> {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const response = await axios.post<{
        item: boolean
        success: boolean
        message?: string
      }>(API_PATHS.USERS.TOTP_DISABLE, null, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || PROFILE_ERROR_MESSAGES.TOTP_DISABLE_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      return response.data.item
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Verifies TOTP during login process
   * @param code TOTP verification code
   * @param sessionId Temporary session ID
   * @returns Authentication result
   */
  static async verifyTOTPLogin(code: string, sessionId: string) {
    try {
      // Check if TOTP session has expired
      const expiryTime = parseInt(sessionStorage.getItem('totp_expiry') || '0', 10)
      if (Date.now() > expiryTime) {
        throw new ApiError(
          AUTH_ERROR_MESSAGES.TOTP_SESSION_EXPIRED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.AUTH_ERROR
        )
      }

      // Call TOTP verification endpoint
      const response = await axios.post<{
        item: any
        success: boolean
        message?: string
      }>(API_PATHS.AUTH.VERIFY_TOTP, { code, sessionId })

      if (!response.data) {
        throw new ApiError(
          AUTH_ERROR_MESSAGES.TOTP_INVALID,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      // After TOTP verification, complete the SRP authentication
      const username = sessionStorage.getItem('srp_username') || ''
      const password = sessionStorage.getItem('srp_password') || ''
      const derivedUsername = sessionStorage.getItem('srp_derived_username') || ''
      const salt = sessionStorage.getItem('srp_salt') || ''
      const clientPublicValueAStr = sessionStorage.getItem('srp_client_public_value_a') || '0'
      const serverPublicValueB = sessionStorage.getItem('srp_server_public_value_b') || '0'
      const clientPrivateValueAStr = sessionStorage.getItem('srp_client_private_value_a') || '0'
      const clientPrivateKeyPem = sessionStorage.getItem('srp_client_private_key_pem') || ''
      const serverPublicKeyPem = sessionStorage.getItem('srp_server_public_key_pem') || ''

      // Convert string values back to BigInt with correct formats
      const clientPublicValueA = BigInt(clientPublicValueAStr)
      const clientPrivateValueA = BigInt(clientPrivateValueAStr)

      // Complete the authentication process
      const result = await completeAuthentication(
        username,
        password,
        derivedUsername,
        salt,
        clientPublicValueA,
        serverPublicValueB,
        clientPrivateValueA,
        clientPrivateKeyPem,
        serverPublicKeyPem
      )

      // Clean up session storage
      this.cleanupTOTPSessionData()

      return result
    } catch (error) {
      console.error(AUTH_ERROR_MESSAGES.TOTP_VERIFICATION_FAILED, error)
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Cleans up all temporary TOTP session data
   */
  static cleanupTOTPSessionData() {
    sessionStorage.removeItem('srp_username')
    sessionStorage.removeItem('srp_password')
    sessionStorage.removeItem('srp_client_private_value_a')
    sessionStorage.removeItem('srp_client_public_value_a')
    sessionStorage.removeItem('srp_client_private_key_pem')
    sessionStorage.removeItem('srp_server_public_key_pem')
    sessionStorage.removeItem('srp_server_public_value_b')
    sessionStorage.removeItem('srp_salt')
    sessionStorage.removeItem('srp_derived_username')
    sessionStorage.removeItem('totp_session_id')
    sessionStorage.removeItem('totp_expiry')
    sessionStorage.removeItem('last_totp_validation')
    sessionStorage.removeItem('totp_attempts')
    sessionStorage.removeItem('totp_locked_until')
  }
}
