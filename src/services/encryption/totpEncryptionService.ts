import { decryptWithAESCBC } from '@/utils/encryptionUtils'

/**
 * Service for handling encryption/decryption operations specific to TOTP process
 */
export class TOTPEncryptionService {
  /**
   * Decrypts TOTP verification response
   *
   * @param response Server response with encrypted session data
   * @returns Decrypted session token and original success flag
   */
  static decryptVerificationResponse({
    encryptedSessionToken,
    helperAuthenticateAesKey,
    success
  }: {
    encryptedSessionToken: { encryptedDataBase64: string; ivBase64: string; hmacBase64: string }
    helperAuthenticateAesKey: string
    success: boolean
  }) {
    // Decrypt the session token using the helper AES key
    const sessionToken = this.decryptWithAES(encryptedSessionToken, helperAuthenticateAesKey)

    // Return both the decrypted sessionToken and the original success flag
    return {
      sessionToken,
      success
    }
  }

  /**
   * Decrypts data from the encrypted object structure using AES-CBC
   *
   * @param encryptedObj The encrypted object containing data, IV and HMAC
   * @param aesKey The AES key to use for decryption
   * @returns Decrypted data as string
   */
  static decryptWithAES(
    encryptedObj: { encryptedDataBase64: string; ivBase64: string; hmacBase64: string },
    aesKey: string
  ) {
    return decryptWithAESCBC(
      encryptedObj.encryptedDataBase64,
      encryptedObj.ivBase64,
      encryptedObj.hmacBase64,
      aesKey
    )
  }
}
