import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'
import { getAuthToken } from '@/stores/authStore'
import type { Domain, DomainResponse } from './encryption/domainEncryptionService'
import { DomainEncryptionService } from './encryption/domainEncryptionService'

interface DomainListResponse {
  item: any
  domains: DomainResponse[]
  totalCount: number
}

/**
 * Service for handling domain operations
 */
export class DomainService {
  /**
   * Fetches all domains with pagination
   * @param page Page number (0-based)
   * @param size Page size
   * @param sortField Field to sort by
   * @param sortDirection Sort direction ('asc' or 'desc')
   * @returns Domain list response
   */
  static async fetchDomains(page = 0, size = 10, sortField?: string, sortDirection?: string) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    const params: Record<string, any> = { page, size }
    if (sortField) params.sort = sortField
    if (sortDirection) params.direction = sortDirection

    const response = await axios.get<DomainListResponse>(`${API_PATHS.DOMAINS.BASE}`, {
      params,
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return response?.data?.item
  }

  /**
   * Fetches a specific domain by ID
   * @param id Domain ID
   * @returns Domain response
   */
  static async fetchDomainById(id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    const response = await axios.get<DomainResponse>(`${API_PATHS.DOMAINS.BASE}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return response?.data?.item
  }

  /**
   * Creates a new domain
   * @param domainData Domain data to create
   * @returns Created domain response
   */
  static async createDomain(domainData: {
    name: string
    url?: string
    notes?: string
    logo?: string
  }) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    // Encrypt the domain data
    const encryptedData = await DomainEncryptionService.encryptDomainData(domainData)

    // Send to server
    const response = await axios.post<DomainResponse>(`${API_PATHS.DOMAINS.BASE}`, encryptedData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return response?.data?.item
  }

  /**
   * Updates an existing domain
   * @param id Domain ID to update
   * @param domainData Updated domain data
   * @returns Updated domain response
   */
  static async updateDomain(
    id: string,
    domainData: { name: string; url?: string; notes?: string; logo?: string }
  ) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    // Encrypt the domain data
    const encryptedData = await DomainEncryptionService.encryptDomainData(domainData)

    // Send to server
    const response = await axios.put<DomainResponse>(
      `${API_PATHS.DOMAINS.BASE}/${id}`,
      encryptedData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response?.data?.item
  }

  /**
   * Deletes a domain
   * @param id Domain ID to delete
   */
  static async deleteDomain(id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    await axios.delete(`${API_PATHS.DOMAINS.BASE}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  }

  /**
   * Gets the credential count for a domain
   * @param id Domain ID
   * @returns Credential count
   */
  static async getCredentialCount(id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    const response = await axios.get<{ item: number }>(
      `${API_PATHS.DOMAINS.BASE}/${id}/credentials/count`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response?.data?.item
  }

  /**
   * Gets all domains with pagination and decrypts them
   * @param page Page number (0-based)
   * @param size Page size
   * @param sortField Field to sort by
   * @param sortDirection Sort direction ('asc' or 'desc')
   * @returns Decrypted domains and total count
   */
  static async getDomains(
    page = 0,
    size = 10,
    sortField?: string,
    sortDirection?: string
  ): Promise<{ domains: Domain[]; totalCount: number }> {
    try {
      const response = await this.fetchDomains(page, size, sortField, sortDirection)

      if (response && Array.isArray(response.domains)) {
        // Decrypt all domains
        const decryptedDomains = await DomainEncryptionService.decryptDomains(response.domains)

        return {
          domains: decryptedDomains,
          totalCount: response.totalCount
        }
      }

      return {
        domains: [],
        totalCount: 0
      }
    } catch (error) {
      console.error('Failed to fetch domains:', error)
      throw error
    }
  }

  /**
   * Gets a specific domain by ID and decrypts it
   * @param id Domain ID
   * @returns Decrypted domain
   */
  static async getDomainById(id: string): Promise<Domain> {
    try {
      const response = await this.fetchDomainById(id)
      return DomainEncryptionService.decryptDomain(response)
    } catch (error) {
      console.error(`Failed to fetch domain with ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Creates a new domain with encrypted data
   * @param domainData Domain data to create
   * @returns Created and decrypted domain
   */
  static async createNewDomain(domainData: {
    name: string
    url?: string
    notes?: string
    logo?: string
  }): Promise<Domain> {
    try {
      const response = await this.createDomain(domainData)

      // Add defensive check to ensure response exists and has required properties
      if (!response || typeof response !== 'object') {
        console.error('Invalid response from createDomain:', response)
        throw new Error('Invalid response from server')
      }

      return DomainEncryptionService.decryptDomain(response)
    } catch (error) {
      console.error('Failed to create domain:', error)
      throw error
    }
  }

  /**
   * Updates an existing domain with encrypted data
   * @param id Domain ID to update
   * @param domainData Updated domain data
   * @returns Updated and decrypted domain
   */
  static async updateExistingDomain(
    id: string,
    domainData: { name: string; url?: string; notes?: string; logo?: string }
  ): Promise<Domain> {
    try {
      const response = await this.updateDomain(id, domainData)
      return DomainEncryptionService.decryptDomain(response)
    } catch (error) {
      console.error(`Failed to update domain with ID ${id}:`, error)
      throw error
    }
  }
}
