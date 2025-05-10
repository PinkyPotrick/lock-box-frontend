import {
  encryptWithPublicKey,
  encryptWithAESCBC,
  decryptWithAESCBC,
  generateAESKey
} from '@/utils/encryptionUtils'
import { padHex } from '@/utils/dataTypesUtils'
import { SecureApiService } from '../secureApiService'

/**
 * Service for handling encryption/decryption operations specific to user registration
 */
export class RegistrationEncryptionService {
  /**
   * Encrypts user registration data for secure transmission
   *
   * @param params Registration data and keys
   * @returns Encrypted data ready to be sent to server
   */
  static async encryptRegistrationData({
    derivedKey,
    derivedUsername,
    email,
    salt,
    verifier,
    clientPublicKeyPem,
    clientPrivateKeyPem
  }: {
    derivedKey: string
    derivedUsername: string
    email: string
    salt: string
    verifier: bigint
    clientPublicKeyPem: string
    clientPrivateKeyPem: string
  }) {
    // Fetch the server's public key
    const serverPublicKeyPem = await SecureApiService.fetchPublicKey()

    // Generate AES key for symmetric encryption
    const aesKey = generateAESKey()

    // Encrypt verifier with AES
    const encryptedClientVerifier = this.encryptWithAES(padHex(verifier), aesKey)

    // Encrypt client keys with AES
    const encryptedClientPublicKey = this.encryptWithAES(clientPublicKeyPem, aesKey)
    const encryptedClientPrivateKey = this.encryptWithAES(clientPrivateKeyPem, aesKey)

    // Prepare the encrypted data payload
    return {
      // RSA encrypted fields (with server public key)
      derivedKey: encryptWithPublicKey(derivedKey, serverPublicKeyPem),
      encryptedDerivedUsername: encryptWithPublicKey(derivedUsername, serverPublicKeyPem),
      encryptedEmail: encryptWithPublicKey(email, serverPublicKeyPem),
      encryptedSalt: encryptWithPublicKey(salt, serverPublicKeyPem),

      // AES encrypted fields
      encryptedClientVerifier,
      encryptedClientPublicKey,
      encryptedClientPrivateKey,

      // The AES key must be sent in plain text (protected by HTTPS)
      helperAesKey: aesKey
    }
  }

  /**
   * Encrypts data with AES and returns the structured object format
   *
   * @param data Data to encrypt
   * @param aesKey AES key to use
   * @returns Structured encrypted data object
   */
  static encryptWithAES(data: string, aesKey: string) {
    const { encryptedData, iv, hmac } = encryptWithAESCBC(data, aesKey)

    return {
      encryptedDataBase64: encryptedData,
      ivBase64: iv,
      hmacBase64: hmac
    }
  }

  /**
   * Decrypts a session token from registration response
   *
   * @param encryptedSessionToken Encrypted session token object
   * @param helperAesKey AES key for decryption
   * @returns Decrypted session token
   */
  static decryptSessionToken(
    encryptedSessionToken: { encryptedDataBase64: string; ivBase64: string; hmacBase64: string },
    helperAesKey: string
  ) {
    return decryptWithAESCBC(
      encryptedSessionToken.encryptedDataBase64,
      encryptedSessionToken.ivBase64,
      encryptedSessionToken.hmacBase64,
      helperAesKey
    )
  }
}
