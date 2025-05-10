import {
  encryptWithPublicKey,
  encryptWithAESCBC,
  decryptWithAESCBC,
  decryptWithPrivateKey
} from '@/utils/encryptionUtils'
import { padHex } from '@/utils/dataTypesUtils'
import { SecureApiService } from '../secureApiService'

/**
 * Service for handling encryption/decryption operations specific to login process
 */
export class LoginEncryptionService {
  /**
   * Encrypts the SRP parameters for the first step of the login process
   *
   * @param clientPublicValueA Client's public value A
   * @param clientPublicKeyPem Client's public key in PEM format
   * @param derivedKey Derived key from username and password
   * @param derivedUsername Encrypted username
   * @param aesKey AES key for symmetric encryption
   * @returns Encrypted data ready to be sent to server
   */
  static async encryptSrpParams({
    clientPublicValueA,
    clientPublicKeyPem,
    derivedKey,
    derivedUsername,
    aesKey
  }: {
    clientPublicValueA: bigint
    clientPublicKeyPem: string
    derivedKey: string
    derivedUsername: string
    aesKey: string
  }) {
    // Fetch server's public key
    const serverPublicKeyPem = await SecureApiService.fetchPublicKey()

    // Encrypt client's public value A with AES
    const encryptedClientPublicValueA = this.encryptWithAES(padHex(clientPublicValueA), aesKey)

    // Encrypt client's public key with AES
    const encryptedClientPublicKey = this.encryptWithAES(clientPublicKeyPem, aesKey)

    // Return the encrypted SRP params data package
    return {
      // RSA encrypted fields
      derivedKey: encryptWithPublicKey(derivedKey, serverPublicKeyPem),
      encryptedDerivedUsername: encryptWithPublicKey(derivedUsername, serverPublicKeyPem),

      // AES encrypted fields
      encryptedClientPublicValueA,
      encryptedClientPublicKey,

      // The AES key must be sent in plain text (protected by HTTPS)
      helperAesKey: aesKey,

      // For later use in the process
      serverPublicKeyPem
    }
  }

  /**
   * Encrypts the client proof for the second step of the login process
   *
   * @param clientProofM1 Client's proof M1
   * @param serverPublicKeyPem Server's public key in PEM format
   * @returns Encrypted client proof data
   */
  static encryptClientProof(clientProofM1: string, serverPublicKeyPem: string) {
    return {
      encryptedClientProofM1: encryptWithPublicKey(clientProofM1, serverPublicKeyPem)
    }
  }

  /**
   * Decrypts server's response data after authentication
   *
   * @param response Server response with encrypted data
   * @param clientPrivateKeyPem Client's private key for decryption
   * @returns Decrypted session data
   */
  static decryptAuthenticationResponse(
    {
      encryptedServerProofM2,
      encryptedSessionToken,
      encryptedUserPublicKey,
      encryptedUserPrivateKey,
      helperAuthenticateAesKey
    }: {
      encryptedServerProofM2: string
      encryptedSessionToken: { encryptedDataBase64: string; ivBase64: string; hmacBase64: string }
      encryptedUserPublicKey: { encryptedDataBase64: string; ivBase64: string; hmacBase64: string }
      encryptedUserPrivateKey: { encryptedDataBase64: string; ivBase64: string; hmacBase64: string }
      helperAuthenticateAesKey: string
    },
    clientPrivateKeyPem: string
  ) {
    return {
      sessionToken: this.decryptWithAES(encryptedSessionToken, helperAuthenticateAesKey),
      userPublicKey: this.decryptWithAES(encryptedUserPublicKey, helperAuthenticateAesKey),
      userPrivateKey: this.decryptWithAES(encryptedUserPrivateKey, helperAuthenticateAesKey),
      serverProofM2: decryptWithPrivateKey(encryptedServerProofM2, clientPrivateKeyPem)
    }
  }

  /**
   * Decrypts server's public value B from SRP params response
   *
   * @param encryptedServerPublicValueB Encrypted server's public value B
   * @param helperSrpParamsAesKey AES key for decryption
   * @returns Decrypted server's public value B
   */
  static decryptServerPublicValueB(
    encryptedServerPublicValueB: {
      encryptedDataBase64: string
      ivBase64: string
      hmacBase64: string
    },
    helperSrpParamsAesKey: string
  ) {
    return decryptWithAESCBC(
      encryptedServerPublicValueB.encryptedDataBase64,
      encryptedServerPublicValueB.ivBase64,
      encryptedServerPublicValueB.hmacBase64,
      helperSrpParamsAesKey
    )
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
