import { decryptWithAESCBC, encryptWithAESCBC, generateAESKey } from '@/utils/encryptionUtils'

/**
 * Interface for encrypted data in AES-CBC format
 */
export interface EncryptedDataAesCbc {
  encryptedDataBase64: string
  ivBase64: string
  hmacBase64: string
}

/**
 * Interface for credential request with encrypted fields
 */
export interface CredentialRequest {
  vaultId: string
  domainId?: string
  encryptedUsername: EncryptedDataAesCbc
  encryptedEmail?: EncryptedDataAesCbc
  encryptedPassword: EncryptedDataAesCbc
  encryptedNotes?: EncryptedDataAesCbc
  encryptedCategory?: EncryptedDataAesCbc
  encryptedFavorite?: EncryptedDataAesCbc
  helperAesKey: string
}

/**
 * Interface for credential response from server
 */
export interface CredentialResponse {
  id: string
  userId: string
  vaultId: string
  domainId?: string
  createdAt: number[] // [year, month, day, hour, minute, second, nano]
  updatedAt: number[] // [year, month, day, hour, minute, second, nano]
  lastUsed?: number[] // [year, month, day, hour, minute, second, nano]

  // Domain info (not encrypted)
  domainName?: string
  domainUrl?: string

  // Encrypted fields
  encryptedUsername: EncryptedDataAesCbc
  encryptedEmail?: EncryptedDataAesCbc
  encryptedPassword: EncryptedDataAesCbc
  encryptedNotes?: EncryptedDataAesCbc
  encryptedCategory?: EncryptedDataAesCbc
  encryptedFavorite?: EncryptedDataAesCbc
  helperAesKey: string
}

/**
 * Interface for credential list response
 */
export interface CredentialListResponse {
  credentials: CredentialResponse[]
  totalCount: number
  vaultName: string
}

/**
 * Interface for decrypted credential data
 */
export interface Credential {
  id: string
  userId: string
  vaultId: string
  domainId?: string
  username: string
  email?: string
  password: string
  notes?: string
  category?: string
  favorite: boolean
  website?: string // Derived from domainName or domainUrl
  domainName?: string
  domainUrl?: string
  createdAt: Date
  updatedAt: Date
  lastUsed?: Date
}

/**
 * Service for handling encryption/decryption operations specific to credential management
 */
export class CredentialEncryptionService {
  /**
   * Encrypts credential data for secure transmission to server
   *
   * @param credentialData Plain credential data to encrypt
   * @param vaultId ID of the vault this credential belongs to
   * @returns Encrypted credential request ready for API submission
   */
  static async encryptCredentialData(
    credentialData: {
      username: string
      email?: string
      password: string
      notes?: string
      category?: string
      favorite?: boolean
      domainId?: string
    },
    vaultId: string
  ): Promise<CredentialRequest> {
    // Generate a random AES key for this credential
    const aesKey = generateAESKey()

    // Encrypt the required fields
    const encryptedUsername = this.encryptWithAES(credentialData.username, aesKey)
    const encryptedPassword = this.encryptWithAES(credentialData.password, aesKey)

    // Encrypt optional fields if provided
    let encryptedEmail, encryptedNotes, encryptedCategory

    if (credentialData.email) {
      encryptedEmail = this.encryptWithAES(credentialData.email, aesKey)
    }

    if (credentialData.notes) {
      encryptedNotes = this.encryptWithAES(credentialData.notes, aesKey)
    }

    if (credentialData.category) {
      encryptedCategory = this.encryptWithAES(credentialData.category, aesKey)
    }

    // Always encrypt favorite status (default to false if not provided)
    const encryptedFavorite = this.encryptWithAES(
      (credentialData.favorite ?? false).toString(),
      aesKey
    )

    // Return the encrypted request format
    return {
      vaultId,
      domainId: credentialData.domainId,
      encryptedUsername,
      encryptedEmail,
      encryptedPassword,
      encryptedNotes,
      encryptedCategory,
      encryptedFavorite,
      helperAesKey: aesKey
    }
  }

  /**
   * Decrypts a credential response from the server
   *
   * @param credentialResponse Encrypted credential response from server
   * @returns Decrypted credential data
   */
  static async decryptCredential(credentialResponse: CredentialResponse): Promise<Credential> {
    const {
      id,
      userId,
      vaultId,
      domainId,
      domainName,
      domainUrl,
      createdAt,
      updatedAt,
      lastUsed,
      encryptedUsername,
      encryptedEmail,
      encryptedPassword,
      encryptedNotes,
      encryptedCategory,
      encryptedFavorite,
      helperAesKey
    } = credentialResponse

    try {
      // Decrypt required fields
      const username = this.decryptWithAES(encryptedUsername, helperAesKey)
      const password = this.decryptWithAES(encryptedPassword, helperAesKey)

      // Decrypt optional fields if present
      let email,
        notes,
        category,
        favorite = false

      if (encryptedEmail) {
        email = this.decryptWithAES(encryptedEmail, helperAesKey)
      }

      if (encryptedNotes) {
        notes = this.decryptWithAES(encryptedNotes, helperAesKey)
      }

      if (encryptedCategory) {
        category = this.decryptWithAES(encryptedCategory, helperAesKey)
      }

      if (encryptedFavorite) {
        const favoriteStr = this.decryptWithAES(encryptedFavorite, helperAesKey)
        favorite = favoriteStr === 'true'
      }

      // Convert date arrays to proper Date objects
      const createdAtDate = this.parseLocalDateTime(createdAt)
      const updatedAtDate = this.parseLocalDateTime(updatedAt)
      const lastUsedDate = lastUsed ? this.parseLocalDateTime(lastUsed) : undefined

      // Derive website from domain info
      const website = domainUrl || domainName || ''

      // Return the decrypted credential data
      return {
        id,
        userId,
        vaultId,
        domainId,
        username,
        email,
        password,
        notes,
        category,
        favorite,
        domainName,
        domainUrl,
        website,
        createdAt: createdAtDate,
        updatedAt: updatedAtDate,
        lastUsed: lastUsedDate
      }
    } catch (error) {
      console.error('Failed to decrypt credential:', error)
      throw new Error('Failed to decrypt credential data')
    }
  }

  /**
   * Parses LocalDateTime array from Java backend to JavaScript Date
   * @param dateTimeArray Array from Java's LocalDateTime [year, month, day, hour, minute, second, nano]
   * @returns JavaScript Date object
   */
  private static parseLocalDateTime(dateTimeArray: any): Date {
    if (!dateTimeArray || !Array.isArray(dateTimeArray)) {
      return new Date()
    }

    const [year, month, day, hour, minute, second, nano] = dateTimeArray
    // Note: JavaScript months are 0-based, so subtract 1 from the month
    return new Date(year, month - 1, day, hour, minute, second, nano / 1000000)
  }

  /**
   * Decrypts multiple credentials from a list response
   *
   * @param credentialResponses Array of credential responses from server
   * @returns Array of decrypted credentials
   */
  static async decryptCredentials(
    credentialResponses: CredentialResponse[]
  ): Promise<Credential[]> {
    return Promise.all(credentialResponses.map((credential) => this.decryptCredential(credential)))
  }

  /**
   * Encrypts data with AES and returns in the standard format
   *
   * @param data Data to encrypt
   * @param aesKey AES key to use
   * @returns Structured encrypted data object
   */
  static encryptWithAES(data: string, aesKey: string): EncryptedDataAesCbc {
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
      return '' // Return empty string on decryption failure
    }
  }
}
