import { padHex } from '@/utils/dataTypesUtils'
import {
  decryptWithAESCBC,
  decryptWithPrivateKey,
  encryptWithAESCBC,
  encryptWithPublicKey
} from '@/utils/encryptionUtils'
import { SecureApiService } from '../secureApiService'

/**
 * Service for handling encryption/decryption operations specific to password change operations
 */
export class PasswordChangeEncryptionService {
  /**
   * Encrypts the password change initiation data
   *
   * @param params Parameters for password change initiation
   * @returns Encrypted data ready for API submission
   */
  static async encryptPasswordChangeInit({
    derivedKey,
    derivedUsername,
    clientPublicValueA,
    aesKey
  }: {
    derivedKey: string
    derivedUsername: string
    clientPublicValueA: bigint
    aesKey: string
  }) {
    // Fetch server's public key
    const serverPublicKeyPem = await SecureApiService.fetchPublicKey()

    // Encrypt with RSA
    const encryptedDerivedKey = encryptWithPublicKey(derivedKey, serverPublicKeyPem)
    const encryptedDerivedUsername = encryptWithPublicKey(derivedUsername, serverPublicKeyPem)

    // Encrypt with AES
    const encryptedClientPublicValueA = this.encryptWithAES(padHex(clientPublicValueA), aesKey)

    // Return the encrypted data package
    return {
      derivedKey: encryptedDerivedKey,
      encryptedDerivedUsername,
      encryptedClientPublicValueA,
      helperAesKey: aesKey
    }
  }

  /**
   * Encrypts the password change completion data
   * Aligned with the registration flow encryption pattern
   *
   * @param params Parameters for password change completion
   * @returns Encrypted data ready for API submission
   */
  static async encryptPasswordChangeComplete({
    clientProofM1,
    newSalt,
    newDerivedKey,
    newDerivedUsername,
    newVerifier,
    aesKey
  }: {
    clientProofM1: string
    newSalt: string
    newDerivedKey: string
    newDerivedUsername: string
    newVerifier: bigint
    aesKey: string
  }) {
    // Fetch server's public key for RSA encryption
    const serverPublicKeyPem = await SecureApiService.fetchPublicKey()

    // Encrypt with RSA (like in registration)
    const encryptedClientProofM1 = encryptWithPublicKey(clientProofM1, serverPublicKeyPem)
    const encryptedNewSalt = encryptWithPublicKey(newSalt, serverPublicKeyPem)
    const encryptedNewDerivedKey = encryptWithPublicKey(newDerivedKey, serverPublicKeyPem)
    const encryptedNewDerivedUsername = encryptWithPublicKey(newDerivedUsername, serverPublicKeyPem)

    // Encrypt with AES (like in registration)
    const encryptedNewVerifier = this.encryptWithAES(padHex(newVerifier), aesKey)

    // Return the encrypted data package with structure matching registration
    return {
      encryptedClientProofM1,
      encryptedNewSalt,
      encryptedNewDerivedKey,
      encryptedNewDerivedUsername,
      encryptedNewVerifier,
      helperAesKey: aesKey
    }
  }

  /**
   * Decrypts server's public value B from the initiation response
   *
   * @param encryptedServerPublicValueB Encrypted server's public value B
   * @param helperAesKey AES key for decryption
   * @returns Decrypted server's public value B
   */
  static decryptServerPublicValueB(
    encryptedServerPublicValueB: {
      encryptedDataBase64: string
      ivBase64: string
      hmacBase64: string
    },
    helperAesKey: string
  ) {
    return decryptWithAESCBC(
      encryptedServerPublicValueB.encryptedDataBase64,
      encryptedServerPublicValueB.ivBase64,
      encryptedServerPublicValueB.hmacBase64,
      helperAesKey
    )
  }

  /**
   * Decrypts server's proof M2 from the completion response
   * Updated to handle RSA encrypted serverProofM2
   *
   * @param encryptedServerProofM2 Encrypted server's proof M2 (RSA encrypted string)
   * @param clientPrivateKeyPem Client's private key in PEM format
   * @returns Decrypted server's proof M2
   */
  static decryptServerProofM2(encryptedServerProofM2: string, clientPrivateKeyPem: string) {
    return decryptWithPrivateKey(encryptedServerProofM2, clientPrivateKeyPem)
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
}
