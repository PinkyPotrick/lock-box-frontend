import { decryptWithAESCBC, encryptWithAESCBC, generateAESKey } from '@/utils/encryptionUtils'

/**
 * Interface for encrypted data in AES-CBC format
 */
export interface EncryptedDataAesCbc {
  iv: string
  salt: string
  data: string
  tag?: string
}

/**
 * Interface for vault request with encrypted fields
 */
export interface VaultRequest {
  userId?: string
  icon?: string
  encryptedName: {
    encryptedDataBase64: string
    ivBase64: string
    hmacBase64: string
  }
  encryptedDescription?: {
    encryptedDataBase64: string
    ivBase64: string
    hmacBase64: string
  }
  helperAesKey: string
}

/**
 * Interface for vault response from server
 */
export interface VaultResponse {
  item: any
  id: string
  userId: string
  icon?: string
  createdAt: number[] // [year, month, day, hour, minute, second, nano]
  updatedAt: number[] // [year, month, day, hour, minute, second, nano]
  credentialCount: number
  encryptedName: {
    encryptedDataBase64: string
    ivBase64: string
    hmacBase64: string
  }
  encryptedDescription?: {
    encryptedDataBase64: string
    ivBase64: string
    hmacBase64: string
  }
  helperAesKey: string
}

/**
 * Interface for decrypted vault data
 */
export interface Vault {
  id: string
  userId: string
  name: string
  description?: string
  icon?: string
  credentialCount: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Service for handling encryption/decryption operations specific to vault management
 */
export class VaultEncryptionService {
  /**
   * Encrypts vault data for secure transmission to server
   *
   * @param vaultData Plain vault data to encrypt
   * @returns Encrypted vault request ready for API submission
   */
  static async encryptVaultData(vaultData: {
    name: string
    description?: string
    icon?: string
  }): Promise<VaultRequest> {
    // Generate a random AES key for this vault
    const aesKey = generateAESKey()

    // Encrypt the vault name
    const encryptedName = this.encryptWithAES(vaultData.name, aesKey)

    // Encrypt description if provided
    let encryptedDescription
    if (vaultData.description) {
      encryptedDescription = this.encryptWithAES(vaultData.description, aesKey)
    }

    // Return the encrypted request format
    return {
      icon: vaultData.icon,
      encryptedName,
      encryptedDescription,
      helperAesKey: aesKey
    }
  }

  /**
   * Decrypts a vault response from the server
   *
   * @param vaultResponse Encrypted vault response from server
   * @returns Decrypted vault data
   */
  static async decryptVault(vaultResponse: VaultResponse): Promise<Vault> {
    const {
      id,
      userId,
      icon,
      createdAt,
      updatedAt,
      credentialCount,
      encryptedName,
      encryptedDescription,
      helperAesKey
    } = vaultResponse

    try {
      // Decrypt the vault name
      const name = this.decryptWithAES(encryptedName, helperAesKey)

      // Decrypt the description if provided
      let description
      if (encryptedDescription) {
        description = this.decryptWithAES(encryptedDescription, helperAesKey)
      }

      // Convert date arrays to proper Date objects
      const createdAtDate = this.parseLocalDateTime(createdAt)
      const updatedAtDate = this.parseLocalDateTime(updatedAt)

      // Return the decrypted vault data
      return {
        id,
        userId,
        name,
        description,
        icon,
        credentialCount,
        createdAt: createdAtDate,
        updatedAt: updatedAtDate
      }
    } catch (error) {
      console.error('Failed to decrypt vault:', error)
      throw new Error('Failed to decrypt vault data')
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
   * Decrypts multiple vaults from a list response
   *
   * @param vaultResponses Array of vault responses from server
   * @returns Array of decrypted vaults
   */
  static async decryptVaults(vaultResponses: VaultResponse[]): Promise<Vault[]> {
    return Promise.all(vaultResponses.map((vault) => this.decryptVault(vault)))
  }

  /**
   * Encrypts data with AES and returns in the standard format
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
  ): string {
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
