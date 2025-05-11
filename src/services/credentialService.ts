import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'
import { getAuthToken } from '@/stores/authStore'
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
    size = 10,
    sort?: string,
    direction?: string
  ) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    const response = await axios.get<{ item: CredentialListResponse }>(
      `${API_PATHS.VAULTS.BASE}/${vaultId}/credentials`,
      {
        params: { page, size, sort, direction },
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response?.data?.item
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
      throw new Error('Authentication token is missing')
    }

    const response = await axios.get<{ item: CredentialResponse }>(
      `${API_PATHS.VAULTS.BASE}/${vaultId}/credentials/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response?.data?.item
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
      throw new Error('Authentication token is missing')
    }

    // Encrypt the credential data
    const encryptedData = await CredentialEncryptionService.encryptCredentialData(
      credentialData,
      vaultId
    )

    // Send to server
    const response = await axios.post<{ item: CredentialResponse }>(
      `${API_PATHS.VAULTS.BASE}/${vaultId}/credentials`,
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
      throw new Error('Authentication token is missing')
    }

    // Encrypt the credential data
    const encryptedData = await CredentialEncryptionService.encryptCredentialData(
      credentialData,
      vaultId
    )

    // Send to server
    const response = await axios.put<{ item: CredentialResponse }>(
      `${API_PATHS.VAULTS.BASE}/${vaultId}/credentials/${id}`,
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
   * Deletes a credential
   * @param vaultId Vault ID
   * @param id Credential ID to delete
   * @returns Success response
   */
  static async deleteCredential(vaultId: string, id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    const response = await axios.delete(`${API_PATHS.VAULTS.BASE}/${vaultId}/credentials/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return response?.data
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
      throw new Error('Authentication token is missing')
    }

    const response = await axios.put<{ item: CredentialResponse }>(
      `${API_PATHS.VAULTS.BASE}/${vaultId}/credentials/${id}/favorite`,
      null,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response?.data?.item
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
      throw new Error('Authentication token is missing')
    }

    const response = await axios.put<{ item: CredentialResponse }>(
      `${API_PATHS.VAULTS.BASE}/${vaultId}/credentials/${id}/used`,
      null,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    return response?.data?.item
  }

  /**
   * Gets all credentials for a vault with pagination and decrypts them
   * @param vaultId Vault ID
   * @param page Page number (0-based)
   * @param size Page size
   * @param sort Sort field
   * @param direction Sort direction (asc/desc)
   * @returns Decrypted credentials, total count, and vault name
   */
  static async getCredentials(
    vaultId: string,
    page = 0,
    size = 10,
    sort?: string,
    direction?: string
  ) {
    try {
      const response = await this.fetchCredentials(vaultId, page, size, sort, direction)

      if (response && Array.isArray(response.credentials)) {
        // Decrypt all credentials
        const decryptedCredentials = await CredentialEncryptionService.decryptCredentials(
          response.credentials
        )

        return {
          credentials: decryptedCredentials,
          totalCount: response.totalCount,
          vaultName: response.vaultName
        }
      }

      return {
        credentials: [],
        totalCount: 0,
        vaultName: ''
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error)
      throw error
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
      return CredentialEncryptionService.decryptCredential(response)
    } catch (error) {
      console.error(`Failed to fetch credential with ID ${id}:`, error)
      throw error
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
      return CredentialEncryptionService.decryptCredential(response)
    } catch (error) {
      console.error('Failed to create credential:', error)
      throw error
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
      return CredentialEncryptionService.decryptCredential(response)
    } catch (error) {
      console.error(`Failed to update credential with ID ${id}:`, error)
      throw error
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
      return CredentialEncryptionService.decryptCredential(response)
    } catch (error) {
      console.error(`Failed to toggle favorite status for credential ${id}:`, error)
      throw error
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
      return CredentialEncryptionService.decryptCredential(response)
    } catch (error) {
      console.error(`Failed to update last used timestamp for credential ${id}:`, error)
      throw error
    }
  }
}
