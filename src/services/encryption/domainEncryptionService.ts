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
 * Interface for domain request with encrypted fields
 */
export interface DomainRequest {
  userId?: string
  logo?: string
  encryptedName: {
    encryptedDataBase64: string
    ivBase64: string
    hmacBase64: string
  }
  encryptedUrl?: {
    encryptedDataBase64: string
    ivBase64: string
    hmacBase64: string
  }
  encryptedNotes?: {
    encryptedDataBase64: string
    ivBase64: string
    hmacBase64: string
  }
  helperAesKey: string
}

/**
 * Interface for domain response from server
 */
export interface DomainResponse {
  item: any
  id: string
  userId: string
  logo?: string
  createdAt: number[] // [year, month, day, hour, minute, second, nano]
  updatedAt: number[] // [year, month, day, hour, minute, second, nano]
  credentialCount: number
  encryptedName: {
    encryptedDataBase64: string
    ivBase64: string
    hmacBase64: string
  }
  encryptedUrl?: {
    encryptedDataBase64: string
    ivBase64: string
    hmacBase64: string
  }
  encryptedNotes?: {
    encryptedDataBase64: string
    ivBase64: string
    hmacBase64: string
  }
  helperAesKey: string
}

/**
 * Interface for decrypted domain data
 */
export interface Domain {
  id: string
  userId: string
  name: string
  url?: string
  notes?: string
  logo?: string
  credentialCount: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Service for handling encryption/decryption operations specific to domain management
 */
export class DomainEncryptionService {
  /**
   * Encrypts domain data for secure transmission to server
   *
   * @param domainData Plain domain data to encrypt
   * @returns Encrypted domain request ready for API submission
   */
  static async encryptDomainData(domainData: {
    name: string
    url?: string
    notes?: string
    logo?: string
  }): Promise<DomainRequest> {
    // Generate a random AES key for this domain
    const aesKey = generateAESKey()

    // Encrypt the domain name
    const encryptedName = this.encryptWithAES(domainData.name, aesKey)

    // Encrypt url if provided
    let encryptedUrl
    if (domainData.url) {
      encryptedUrl = this.encryptWithAES(domainData.url, aesKey)
    }

    // Encrypt notes if provided
    let encryptedNotes
    if (domainData.notes) {
      encryptedNotes = this.encryptWithAES(domainData.notes, aesKey)
    }

    // Return the encrypted request format
    return {
      logo: domainData.logo,
      encryptedName,
      encryptedUrl,
      encryptedNotes,
      helperAesKey: aesKey
    }
  }

  /**
   * Decrypts a domain response from the server
   *
   * @param domainResponse Encrypted domain response from server
   * @returns Decrypted domain data
   */
  static async decryptDomain(domainResponse: DomainResponse): Promise<Domain> {
    const {
      id,
      userId,
      logo,
      createdAt,
      updatedAt,
      credentialCount,
      encryptedName,
      encryptedUrl,
      encryptedNotes,
      helperAesKey
    } = domainResponse

    try {
      // Decrypt the domain name
      const name = this.decryptWithAES(encryptedName, helperAesKey)

      // Decrypt the url if provided
      let url
      if (encryptedUrl) {
        url = this.decryptWithAES(encryptedUrl, helperAesKey)
      }

      // Decrypt the notes if provided
      let notes
      if (encryptedNotes) {
        notes = this.decryptWithAES(encryptedNotes, helperAesKey)
      }

      // Convert date arrays to proper Date objects
      const createdAtDate = this.parseLocalDateTime(createdAt)
      const updatedAtDate = this.parseLocalDateTime(updatedAt)

      // Return the decrypted domain data
      return {
        id,
        userId,
        name,
        url,
        notes,
        logo,
        credentialCount,
        createdAt: createdAtDate,
        updatedAt: updatedAtDate
      }
    } catch (error) {
      console.error('Failed to decrypt domain:', error)
      throw new Error('Failed to decrypt domain data')
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
   * Decrypts multiple domains from a list response
   *
   * @param domainResponses Array of domain responses from server
   * @returns Array of decrypted domains
   */
  static async decryptDomains(domainResponses: DomainResponse[]): Promise<Domain[]> {
    return Promise.all(domainResponses.map((domain) => this.decryptDomain(domain)))
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
