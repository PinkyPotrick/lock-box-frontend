import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'
import {
  CREDENTIAL_CATEGORIES,
  CREDENTIAL_ERROR_MESSAGES,
  DEFAULTS,
  ERROR_TYPES,
  GENERIC_ERROR_MESSAGES,
  HTTP_STATUS
} from '@/constants/appConstants'
import { getAuthToken } from '@/stores/authStore'
import { ApiError, ApiErrorService } from './apiErrorService'
import {
  CredentialEncryptionService,
  type Credential,
  type CredentialListResponse,
  type CredentialResponse
} from './encryption/credentialEncryptionService'

/**
 * Service for handling credential operations
 */
export class CredentialService {
  /**
   * Fetches all credentials for a vault with pagination
   * @param vaultId Vault ID
   * @param page Page number (0-based)
   * @param size Page size
   * @param sort Sort field
   * @param direction Sort direction (asc/desc)
   * @returns Credentials list response
   */
  static async fetchCredentials(
    vaultId: string,
    page = 0,
    size = DEFAULTS.PAGE_SIZE,
    sort?: string,
    direction: string = DEFAULTS.DEFAULT_SORT_DIRECTION
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
      if (sort) params.sort = sort
      if (direction) params.direction = direction

      const response = await axios.get<{
        item: CredentialListResponse
        success: boolean
        message?: string
      }>(`${API_PATHS.VAULTS.BASE}/${vaultId}/credentials`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || CREDENTIAL_ERROR_MESSAGES.FETCH_CREDENTIALS_FAILED,
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
   * Fetches a specific credential by ID
   * @param vaultId Vault ID
   * @param id Credential ID
   * @returns Credential response
   */
  static async fetchCredentialById(vaultId: string, id: string) {
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
        item: CredentialResponse
        success: boolean
        message?: string
      }>(`${API_PATHS.VAULTS.BASE}/${vaultId}/credentials/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || `${CREDENTIAL_ERROR_MESSAGES.FETCH_CREDENTIALS_FAILED} ${id}`,
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
   * Creates a new credential
   * @param vaultId Vault ID
   * @param credentialData Credential data to create
   * @returns Created credential response
   */
  static async createCredential(
    vaultId: string,
    credentialData: {
      username: string
      email?: string
      password: string
      notes?: string
      category?: string
      favorite?: boolean
      domainId?: string
    }
  ) {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    // Validate category if provided
    if (credentialData.category && !CREDENTIAL_CATEGORIES.includes(credentialData.category)) {
      throw new ApiError(
        CREDENTIAL_ERROR_MESSAGES.INVALID_CATEGORY.replace(
          '{categories}',
          CREDENTIAL_CATEGORIES.join(', ')
        ),
        HTTP_STATUS.BAD_REQUEST,
        ERROR_TYPES.VALIDATION_ERROR
      )
    }

    try {
      // Encrypt the credential data
      const encryptedData = await CredentialEncryptionService.encryptCredentialData(
        credentialData,
        vaultId
      )

      // Send to server
      const response = await axios.post<{
        item: CredentialResponse
        success: boolean
        message?: string
        statusCode?: number
        errorType?: string
        timestamp?: any
      }>(`${API_PATHS.VAULTS.BASE}/${vaultId}/credentials`, encryptedData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || CREDENTIAL_ERROR_MESSAGES.CREATE_CREDENTIAL_FAILED,
          response.data.statusCode || HTTP_STATUS.BAD_REQUEST,
          response.data.errorType || ERROR_TYPES.API_ERROR,
          response.data.timestamp
        )
      }

      return response?.data?.item
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Updates an existing credential
   * @param vaultId Vault ID
   * @param id Credential ID to update
   * @param credentialData Updated credential data
   * @returns Updated credential response
   */
  static async updateCredential(
    vaultId: string,
    id: string,
    credentialData: {
      username: string
      email?: string
      password: string
      notes?: string
      category?: string
      favorite?: boolean
      domainId?: string
    }
  ) {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    // Validate category if provided
    if (credentialData.category && !CREDENTIAL_CATEGORIES.includes(credentialData.category)) {
      throw new ApiError(
        CREDENTIAL_ERROR_MESSAGES.INVALID_CATEGORY.replace(
          '{categories}',
          CREDENTIAL_CATEGORIES.join(', ')
        ),
        HTTP_STATUS.BAD_REQUEST,
        ERROR_TYPES.VALIDATION_ERROR
      )
    }

    try {
      // Encrypt the credential data
      const encryptedData = await CredentialEncryptionService.encryptCredentialData(
        credentialData,
        vaultId
      )

      // Send to server
      const response = await axios.put<{
        item: CredentialResponse
        success: boolean
        message?: string
        statusCode?: number
        errorType?: string
        timestamp?: any
      }>(`${API_PATHS.VAULTS.BASE}/${vaultId}/credentials/${id}`, encryptedData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || `${CREDENTIAL_ERROR_MESSAGES.UPDATE_CREDENTIAL_FAILED} ${id}`,
          response.data.statusCode || HTTP_STATUS.BAD_REQUEST,
          response.data.errorType || ERROR_TYPES.API_ERROR,
          response.data.timestamp
        )
      }

      return response?.data?.item
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Deletes a credential
   * @param vaultId Vault ID
   * @param id Credential ID to delete
   * @returns Success response
   */
  static async deleteCredential(vaultId: string, id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const response = await axios.delete<{
        success: boolean
        message?: string
        statusCode?: number
        errorType?: string
      }>(`${API_PATHS.VAULTS.BASE}/${vaultId}/credentials/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || `${CREDENTIAL_ERROR_MESSAGES.DELETE_CREDENTIAL_FAILED} ${id}`,
          response.data.statusCode || HTTP_STATUS.BAD_REQUEST,
          response.data.errorType || ERROR_TYPES.API_ERROR
        )
      }

      return response?.data
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Toggles the favorite status of a credential
   * @param vaultId Vault ID
   * @param id Credential ID
   * @returns Updated credential response
   */
  static async toggleFavorite(vaultId: string, id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const response = await axios.put<{
        item: CredentialResponse
        success: boolean
        message?: string
      }>(`${API_PATHS.VAULTS.BASE}/${vaultId}/credentials/${id}/favorite`, null, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || `${CREDENTIAL_ERROR_MESSAGES.TOGGLE_FAVORITE_FAILED} ${id}`,
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
   * Updates the last used timestamp of a credential
   * @param vaultId Vault ID
   * @param id Credential ID
   * @returns Updated credential response
   */
  static async updateLastUsed(vaultId: string, id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const response = await axios.put<{
        item: CredentialResponse
        success: boolean
        message?: string
      }>(`${API_PATHS.VAULTS.BASE}/${vaultId}/credentials/${id}/used`, null, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.data && !response.data.success) {
        throw new ApiError(
          response.data.message || `${CREDENTIAL_ERROR_MESSAGES.UPDATE_LAST_USED_FAILED} ${id}`,
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
   * Gets all credentials for a vault with pagination and decrypts them
   * @param vaultId Vault ID
   * @param page Page number (0-based)
   * @param size Page size
   * @param sort Sort field
   * @param direction Sort direction (asc/desc)
   * @param filters Filters for credentials
   * @returns Decrypted credentials, total count, and vault name
   */
  static async getCredentials(
    vaultId: string,
    page = 0,
    size = DEFAULTS.PAGE_SIZE,
    sort?: string,
    direction: string = DEFAULTS.DEFAULT_SORT_DIRECTION,
    filters?: {
      favorite?: boolean
      category?: string
      search?: string
    }
  ) {
    try {
      // Build parameters including filters
      const params: Record<string, any> = { page, size }
      if (sort) params.sort = sort
      if (direction) params.direction = direction

      // Add filter parameters
      if (filters) {
        if (filters.favorite !== undefined) params.favorite = filters.favorite
        if (filters.category) params.category = filters.category
        if (filters.search) params.search = filters.search
      }

      const response = await this.fetchCredentials(vaultId, page, size, sort, direction)

      if (response && Array.isArray(response.credentials)) {
        // Decrypt all credentials
        const decryptedCredentials = await CredentialEncryptionService.decryptCredentials(
          response.credentials
        )

        // Decrypt vault name if provided in the new format
        let vaultName = ''
        if (response.encryptedVaultName && response.helperVaultNameAesKey) {
          vaultName = CredentialEncryptionService.decryptVaultName(
            response.encryptedVaultName,
            response.helperVaultNameAesKey
          )
        } else {
          // Fallback to the old format or a default
          vaultName = response.vaultName || 'Vault'
        }

        return {
          credentials: decryptedCredentials,
          totalCount: response.totalCount,
          vaultName: vaultName
        }
      }

      return {
        credentials: [],
        totalCount: 0,
        vaultName: 'Vault'
      }
    } catch (error) {
      console.error(CREDENTIAL_ERROR_MESSAGES.FETCH_CREDENTIALS_FAILED, error)
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Gets a specific credential by ID and decrypts it
   * @param vaultId Vault ID
   * @param id Credential ID
   * @returns Decrypted credential
   */
  static async getCredentialById(vaultId: string, id: string): Promise<Credential> {
    try {
      const response = await this.fetchCredentialById(vaultId, id)

      if (!response) {
        throw new ApiError(
          CREDENTIAL_ERROR_MESSAGES.CREDENTIAL_NOT_FOUND.replace('{id}', id),
          HTTP_STATUS.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND_ERROR
        )
      }

      return CredentialEncryptionService.decryptCredential(response)
    } catch (error) {
      console.error(`${CREDENTIAL_ERROR_MESSAGES.FETCH_CREDENTIALS_FAILED} ${id}:`, error)
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Creates a new credential with encrypted data
   * @param vaultId Vault ID
   * @param credentialData Credential data to create
   * @returns Created and decrypted credential
   */
  static async createNewCredential(
    vaultId: string,
    credentialData: {
      username: string
      email?: string
      password: string
      notes?: string
      category?: string
      favorite?: boolean
      domainId?: string
    }
  ): Promise<Credential> {
    try {
      const response = await this.createCredential(vaultId, credentialData)

      if (!response) {
        throw new ApiError(
          GENERIC_ERROR_MESSAGES.INVALID_SERVER_RESPONSE,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.API_ERROR
        )
      }

      return CredentialEncryptionService.decryptCredential(response)
    } catch (error) {
      console.error(CREDENTIAL_ERROR_MESSAGES.CREATE_CREDENTIAL_FAILED, error)
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Updates an existing credential with encrypted data
   * @param vaultId Vault ID
   * @param id Credential ID to update
   * @param credentialData Updated credential data
   * @returns Updated and decrypted credential
   */
  static async updateExistingCredential(
    vaultId: string,
    id: string,
    credentialData: {
      username: string
      email?: string
      password: string
      notes?: string
      category?: string
      favorite?: boolean
      domainId?: string
    }
  ): Promise<Credential> {
    try {
      const response = await this.updateCredential(vaultId, id, credentialData)

      if (!response) {
        throw new ApiError(
          `${CREDENTIAL_ERROR_MESSAGES.UPDATE_CREDENTIAL_FAILED} ${id}`,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.API_ERROR
        )
      }

      return CredentialEncryptionService.decryptCredential(response)
    } catch (error) {
      console.error(`${CREDENTIAL_ERROR_MESSAGES.UPDATE_CREDENTIAL_FAILED} ${id}:`, error)
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Toggles the favorite status of a credential and returns the decrypted updated credential
   * @param vaultId Vault ID
   * @param id Credential ID
   * @returns Decrypted updated credential
   */
  static async toggleCredentialFavorite(vaultId: string, id: string): Promise<Credential> {
    try {
      const response = await this.toggleFavorite(vaultId, id)

      if (!response) {
        throw new ApiError(
          `${CREDENTIAL_ERROR_MESSAGES.TOGGLE_FAVORITE_FAILED} ${id}`,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.API_ERROR
        )
      }

      return CredentialEncryptionService.decryptCredential(response)
    } catch (error) {
      console.error(`${CREDENTIAL_ERROR_MESSAGES.TOGGLE_FAVORITE_FAILED} ${id}:`, error)
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Updates the last used timestamp of a credential and returns the decrypted updated credential
   * @param vaultId Vault ID
   * @param id Credential ID
   * @returns Decrypted updated credential
   */
  static async updateCredentialLastUsed(vaultId: string, id: string): Promise<Credential> {
    try {
      const response = await this.updateLastUsed(vaultId, id)

      if (!response) {
        throw new ApiError(
          `${CREDENTIAL_ERROR_MESSAGES.UPDATE_LAST_USED_FAILED} ${id}`,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_TYPES.API_ERROR
        )
      }

      return CredentialEncryptionService.decryptCredential(response)
    } catch (error) {
      console.error(`${CREDENTIAL_ERROR_MESSAGES.UPDATE_LAST_USED_FAILED} ${id}:`, error)
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Gets all credentials for a vault without pagination
   * Used for exports and backups
   * @param vaultId Vault ID
   * @returns All decrypted credentials and vault name
   */
  static async getAllCredentialsForVault(
    vaultId: string
  ): Promise<{ credentials: Credential[]; vaultName: string }> {
    try {
      const result = await this.getCredentials(vaultId, 0, DEFAULTS.LARGE_PAGE_SIZE)
      return {
        credentials: result.credentials,
        vaultName: result.vaultName
      }
    } catch (error) {
      console.error(`Failed to get all credentials for vault ${vaultId}:`, error)
      throw ApiErrorService.handleError(error)
    }
  }
}
