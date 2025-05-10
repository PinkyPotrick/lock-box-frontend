import { decryptWithAESCBC } from '@/utils/encryptionUtils'

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
    encryptedUserProfile: { encryptedDataBase64: string; ivBase64: string; hmacBase64: string },
    helperAesKey: string
  ) {
    // Decrypt the profile data using the helper AES key
    const decryptedProfileJson = this.decryptWithAES(encryptedUserProfile, helperAesKey)

    // Parse the JSON string to get the profile object
    return JSON.parse(decryptedProfileJson)
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
