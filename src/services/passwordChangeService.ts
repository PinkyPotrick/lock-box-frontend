import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'
import {
  ERROR_TYPES,
  GENERIC_ERROR_MESSAGES,
  HTTP_STATUS,
  PASSWORD_CHANGE_ERROR_MESSAGES
} from '@/constants/appConstants'
import { getAuthToken } from '@/stores/authStore'
import {
  computeA,
  computeK,
  computeM1,
  computeM2,
  computeS,
  computeU,
  computeVerifier,
  computeX,
  generateSalt
} from '@/utils/authUtils'
import { bigIntFromBytes } from '@/utils/dataTypesUtils'
import {
  deriveEncryptionKey,
  encryptUsername,
  generateAESKey,
  getClientKeyPair
} from '@/utils/encryptionUtils'
import forge from 'node-forge'
import { ApiError, ApiErrorService } from './apiErrorService'
import { PasswordChangeEncryptionService } from './encryption/passwordChangeEncryptionService'

/**
 * Service for handling password change operations using SRP protocol
 */
export class PasswordChangeService {
  /**
   * Initiates the password change process using SRP protocol
   * @param username User's username
   * @param currentPassword User's current password
   * @returns SRP state for the second step
   */
  static async initiatePasswordChange(username: string, currentPassword: string) {
    if (!username || !currentPassword) {
      throw new ApiError(
        PASSWORD_CHANGE_ERROR_MESSAGES.MISSING_CREDENTIALS,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_TYPES.VALIDATION_ERROR
      )
    }

    try {
      const token = getAuthToken()
      if (!token) {
        throw new ApiError(
          GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_TYPES.AUTH_ERROR
        )
      }

      // Derive key and username like in login
      const derivedKey = deriveEncryptionKey(username, currentPassword)
      const derivedUsername = encryptUsername(username, derivedKey)

      // Generate client SRP values
      const clientPrivateValueA = bigIntFromBytes(forge.random.getBytesSync(32))
      const clientPublicValueA = computeA(clientPrivateValueA)
      const aesKey = generateAESKey()

      // Encrypt data for initiation request
      const encryptedData = await PasswordChangeEncryptionService.encryptPasswordChangeInit({
        derivedKey,
        derivedUsername,
        clientPublicValueA,
        aesKey
      })

      // Send initiation request
      const response = await axios.post<{
        item: any
        success: boolean
        message?: string
      }>(API_PATHS.USERS.PASSWORD_CHANGE_INIT, encryptedData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.data.success) {
        throw new ApiError(
          response.data.message || PASSWORD_CHANGE_ERROR_MESSAGES.INIT_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      // Decrypt the server's response
      const { encryptedServerPublicValueB, salt, helperAesKey } = response.data.item

      // Decrypt the server's public value B
      const serverPublicValueB = PasswordChangeEncryptionService.decryptServerPublicValueB(
        encryptedServerPublicValueB,
        helperAesKey
      )

      // Store values needed for the second step
      return {
        clientPrivateValueA,
        clientPublicValueA,
        serverPublicValueB,
        salt,
        helperAesKey
      }
    } catch (error) {
      console.error('Password change initiation failed:', error)
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Completes the password change process using SRP protocol
   * Similar to registration and login flow
   *
   * @param username User's username
   * @param currentPassword User's current password
   * @param newPassword User's new password
   * @param srpState SRP state from the first step
   * @returns true if successful
   */
  static async completePasswordChange(
    username: string,
    currentPassword: string,
    newPassword: string,
    srpState: {
      clientPrivateValueA: bigint | null
      clientPublicValueA: bigint | null
      serverPublicValueB: string | null
      salt: string | null
      helperAesKey: string | null
    }
  ) {
    if (
      !username ||
      !currentPassword ||
      !newPassword ||
      !srpState.clientPrivateValueA ||
      !srpState.serverPublicValueB ||
      !srpState.salt ||
      !srpState.helperAesKey
    ) {
      throw new ApiError(
        PASSWORD_CHANGE_ERROR_MESSAGES.INVALID_STATE,
        HTTP_STATUS.BAD_REQUEST,
        ERROR_TYPES.VALIDATION_ERROR
      )
    }

    try {
      const token = getAuthToken()
      if (!token) {
        throw new ApiError(
          GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
          HTTP_STATUS.UNAUTHORIZED,
          ERROR_TYPES.AUTH_ERROR
        )
      }

      // STEP 1: Handle current password verification (like in login)
      // Derive key and username for current password
      const derivedKey = deriveEncryptionKey(username, currentPassword)
      const derivedUsername = encryptUsername(username, derivedKey)

      // Compute SRP proof values for current password verification
      const privateValueX = computeX(srpState.salt, derivedUsername, currentPassword)
      const scramblingParameterU = computeU(BigInt(`0x${srpState.serverPublicValueB}`))
      const sharedSecretS = computeS(
        BigInt(`0x${srpState.serverPublicValueB}`),
        privateValueX,
        srpState.clientPrivateValueA,
        scramblingParameterU
      )
      const sessionKeyK = computeK(sharedSecretS)

      if (!srpState.clientPublicValueA) {
        throw new ApiError(
          PASSWORD_CHANGE_ERROR_MESSAGES.INVALID_STATE,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.VALIDATION_ERROR
        )
      }

      const clientProofM1 = computeM1(
        derivedUsername,
        srpState.salt,
        srpState.clientPublicValueA,
        BigInt(`0x${srpState.serverPublicValueB}`),
        sessionKeyK
      )

      // STEP 2: Handle new password setup (like in registration)
      // Generate new derived key and username for new password
      const newDerivedKey = deriveEncryptionKey(username, newPassword)
      const newDerivedUsername = encryptUsername(username, newDerivedKey)

      // Generate new salt and verifier for the new password
      const newSalt = generateSalt()
      const newVerifier = computeVerifier(newSalt, newDerivedUsername, newPassword)

      // Generate AES key for this request
      const aesKey = generateAESKey()

      // Encrypt data for completion request with both verification and new data
      const encryptedData = await PasswordChangeEncryptionService.encryptPasswordChangeComplete({
        clientProofM1,
        newSalt,
        newDerivedKey,
        newDerivedUsername,
        newVerifier,
        aesKey
      })

      // Send completion request
      const response = await axios.post<{
        item: any
        success: boolean
        message?: string
      }>(API_PATHS.USERS.PASSWORD_CHANGE_COMPLETE, encryptedData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.data.success) {
        throw new ApiError(
          response.data.message || PASSWORD_CHANGE_ERROR_MESSAGES.COMPLETE_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      // Decrypt and verify server's response
      const { encryptedServerProofM2 } = response.data.item

      // Get the client's private key for decryption
      const { privateKeyPem: clientPrivateKeyPem } = await getClientKeyPair(
        username,
        currentPassword
      )

      const serverProofM2 = PasswordChangeEncryptionService.decryptServerProofM2(
        encryptedServerProofM2,
        clientPrivateKeyPem
      )

      // Verify server's proof
      if (!srpState.clientPublicValueA) {
        throw new ApiError(
          PASSWORD_CHANGE_ERROR_MESSAGES.INVALID_STATE,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.VALIDATION_ERROR
        )
      }
      const clientProofM2 = computeM2(srpState.clientPublicValueA, clientProofM1, sessionKeyK)
      if (clientProofM2 !== serverProofM2) {
        throw new ApiError(
          PASSWORD_CHANGE_ERROR_MESSAGES.PROOF_VERIFICATION_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.AUTH_ERROR
        )
      }

      return true
    } catch (error) {
      console.error('Password change completion failed:', error)
      throw ApiErrorService.handleError(PASSWORD_CHANGE_ERROR_MESSAGES.COMPLETE_FAILED)
    }
  }
}
