import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'
import {
  DEFAULTS,
  DOMAIN_ERROR_MESSAGES,
  ERROR_TYPES,
  GENERIC_ERROR_MESSAGES,
  HTTP_STATUS
} from '@/constants/appConstants'
import { getAuthToken } from '@/stores/authStore'
import { ApiError, ApiErrorService } from './apiErrorService'
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
  static async fetchDomains(
    page = 0,
    size = DEFAULTS.PAGE_SIZE,
    sortField?: string,
    sortDirection?: string
  ) {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const params: Record<string, any> = { page, size }
      if (sortField) params.sort = sortField
      if (sortDirection) params.direction = sortDirection

      const response = await axios.get<{
        item: DomainListResponse
        success: boolean
        message?: string
      }>(`${API_PATHS.DOMAINS.BASE}`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || DOMAIN_ERROR_MESSAGES.FETCH_DOMAINS_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      return response?.data?.item
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Fetches a specific domain by ID
   * @param id Domain ID
   * @returns Domain response
   */
  static async fetchDomainById(id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const response = await axios.get<{
        item: DomainResponse
        success: boolean
        message?: string
      }>(`${API_PATHS.DOMAINS.BASE}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || `${DOMAIN_ERROR_MESSAGES.FETCH_DOMAIN_FAILED} ${id}`,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      return response?.data?.item
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
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
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      // Encrypt the domain data
      const encryptedData = await DomainEncryptionService.encryptDomainData(domainData)

      // Send to server
      const response = await axios.post<{
        item: DomainResponse
        success: boolean
        message?: string
      }>(`${API_PATHS.DOMAINS.BASE}`, encryptedData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || DOMAIN_ERROR_MESSAGES.CREATE_DOMAIN_FAILED,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      return response?.data?.item
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
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
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      // Encrypt the domain data
      const encryptedData = await DomainEncryptionService.encryptDomainData(domainData)

      // Send to server
      const response = await axios.put<{
        item: DomainResponse
        success: boolean
        message?: string
      }>(`${API_PATHS.DOMAINS.BASE}/${id}`, encryptedData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || `${DOMAIN_ERROR_MESSAGES.UPDATE_DOMAIN_FAILED} ${id}`,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      return response?.data?.item
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Deletes a domain
   * @param id Domain ID to delete
   */
  static async deleteDomain(id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const response = await axios.delete<{ success: boolean; message?: string }>(
        `${API_PATHS.DOMAINS.BASE}/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || `${DOMAIN_ERROR_MESSAGES.DELETE_DOMAIN_FAILED} ${id}`,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Gets a chunk of domains with pagination and decrypts them
   * Optimized for chunked loading pattern
   * @param page Page number (0-based) - represents the chunk number
   * @param chunkSize Size of each chunk to fetch
   * @param sortField Field to sort by on server (typically createAt for consistent chunk loading)
   * @param sortDirection Sort direction ('asc' or 'desc')
   * @returns Decrypted domains and total count
   */
  static async getDomains(
    page = 0,
    chunkSize = DEFAULTS.CHUNK_SIZE,
    sortField = 'createdAt',
    sortDirection = 'desc'
  ): Promise<{ domains: Domain[]; totalCount: number }> {
    try {
      // Fetch the current chunk from the server
      const response = await this.fetchDomains(page, chunkSize, sortField, sortDirection)

      if (response && Array.isArray(response.domains)) {
        // Decrypt all domains - credential counts will come from the server
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
      throw ApiErrorService.handleError(error)
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

      if (!response) {
        throw new ApiError(
          DOMAIN_ERROR_MESSAGES.DOMAIN_NOT_FOUND.replace('{id}', id),
          HTTP_STATUS.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND_ERROR
        )
      }

      // Simply decrypt the domain with its credential count from the server
      return await DomainEncryptionService.decryptDomain(response)
    } catch (error) {
      throw ApiErrorService.handleError(error)
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

      // Add defensive check to ensure response exists
      if (!response) {
        throw new ApiError(
          GENERIC_ERROR_MESSAGES.INVALID_SERVER_RESPONSE,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.API_ERROR
        )
      }

      // New domains should use the credentialCount from response (which should be 0)
      return await DomainEncryptionService.decryptDomain(response)
    } catch (error) {
      throw ApiErrorService.handleError(error)
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

      if (!response) {
        throw new ApiError(
          `${DOMAIN_ERROR_MESSAGES.UPDATE_DOMAIN_FAILED} ${id}`,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.API_ERROR
        )
      }

      // Updated domain should use the credentialCount from response
      return await DomainEncryptionService.decryptDomain(response)
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Gets all domains without pagination and decrypts them
   * Used for dropdowns and selectors
   * @returns All decrypted domains
   */
  static async getAllDomains(): Promise<Domain[]> {
    try {
      // Fetch with a large size to get all domains
      const response = await this.getDomains(0, DEFAULTS.LARGE_PAGE_SIZE)
      return response.domains
    } catch (error) {
      console.error(DOMAIN_ERROR_MESSAGES.FETCH_ALL_DOMAINS_FAILED, error)
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Gets domains by name for search/autocomplete
   * @param query Search query
   * @returns Filtered domains that match the query
   */
  static async searchDomainsByName(query: string): Promise<Domain[]> {
    try {
      // Get all domains then filter client-side
      // This is temporary - in production with large data, implement server-side search
      const allDomains = await this.getAllDomains()

      if (!query) return allDomains

      const lowerQuery = query.toLowerCase()
      return allDomains.filter(
        (domain) =>
          domain.name.toLowerCase().includes(lowerQuery) ||
          (domain.url && domain.url.toLowerCase().includes(lowerQuery))
      )
    } catch (error) {
      console.error(DOMAIN_ERROR_MESSAGES.SEARCH_DOMAINS_FAILED, error)
      throw ApiErrorService.handleError(error)
    }
  }
}
