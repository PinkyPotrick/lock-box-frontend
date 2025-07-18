import { decryptWithAESCBC } from '@/utils/encryptionUtils'

/**
 * Service for handling encryption/decryption operations for dashboard data
 */
export class DashboardEncryptionService {
  /**
   * Decrypts overview statistics response from server
   *
   * @param encryptedOverview The encrypted overview data from server
   * @param helperAesKey AES key for decryption
   * @returns Decrypted overview statistics
   */
  static decryptOverviewResponse(
    encryptedOverview: { encryptedDataBase64: string; ivBase64: string; hmacBase64: string },
    helperAesKey: string
  ) {
    // Decrypt the overview data using the helper AES key
    const decryptedOverviewJson = this.decryptWithAES(encryptedOverview, helperAesKey)

    // Parse the JSON string to get the overview object
    return JSON.parse(decryptedOverviewJson)
  }

  /**
   * Decrypts login history response from server
   *
   * @param encryptedLoginHistory The encrypted login history from server
   * @param helperAesKey AES key for decryption
   * @returns Decrypted login history data
   */
  static decryptLoginHistoryResponse(
    encryptedLoginHistory: { encryptedDataBase64: string; ivBase64: string; hmacBase64: string },
    helperAesKey: string
  ) {
    // Decrypt the login history using the helper AES key
    const decryptedLoginHistoryJson = this.decryptWithAES(encryptedLoginHistory, helperAesKey)

    // Parse the JSON string to get the login history object
    return JSON.parse(decryptedLoginHistoryJson)
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
