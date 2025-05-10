import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'
import { getAuthToken } from '@/stores/authStore'
import type { Vault, VaultResponse } from './encryption/vaultEncryptionService'
import { VaultEncryptionService } from './encryption/vaultEncryptionService'

interface VaultListResponse {
  item: any
  vaults: VaultResponse[]
  totalCount: number
}

/**
 * Service for handling vault operations
 */
export class VaultService {
  /**
   * Fetches all vaults for the current user with pagination
   * @param page Page number (0-based)
   * @param size Page size
   * @returns Vaults list response
   */
  static async fetchVaults(page = 0, size = 10) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    const response = await axios.get<VaultListResponse>(`${API_PATHS.VAULTS.BASE}`, {
      params: { page, size },
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return response?.data?.item
  }

  /**
   * Fetches a specific vault by ID
   * @param id Vault ID
   * @returns Vault response
   */
  static async fetchVaultById(id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    const response = await axios.get<VaultResponse>(`${API_PATHS.VAULTS.BASE}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return response?.data?.item
  }

  /**
   * Creates a new vault
   * @param vaultData Vault data to create
   * @returns Created vault response
   */
  static async createVault(vaultData: { name: string; description?: string; icon?: string }) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    // Encrypt the vault data
    const encryptedData = await VaultEncryptionService.encryptVaultData(vaultData)

    // Send to server
    const response = await axios.post<VaultResponse>(`${API_PATHS.VAULTS.BASE}`, encryptedData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return response?.data?.item
  }

  /**
   * Updates an existing vault
   * @param id Vault ID to update
   * @param vaultData Updated vault data
   * @returns Updated vault response
   */
  static async updateVault(
    id: string,
    vaultData: { name: string; description?: string; icon?: string }
  ) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    // Encrypt the vault data
    const encryptedData = await VaultEncryptionService.encryptVaultData(vaultData)

    // Send to server
    const response = await axios.put<VaultResponse>(
      `${API_PATHS.VAULTS.BASE}/${id}`,
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
   * Deletes a vault
   * @param id Vault ID to delete
   * @returns Success response
   */
  static async deleteVault(id: string) {
    const token = getAuthToken()

    if (!token) {
      throw new Error('Authentication token is missing')
    }

    const response = await axios.delete(`${API_PATHS.VAULTS.BASE}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return response?.data?.item
  }

  /**
   * Gets all vaults with pagination and decrypts them
   * @param page Page number (0-based)
   * @param size Page size
   * @returns Decrypted vaults and total count
   */
  static async getVaults(page = 0, size = 10) {
    try {
      const response = await this.fetchVaults(page, size)

      if (response && Array.isArray(response.vaults)) {
        // Decrypt all vaults
        const decryptedVaults = await VaultEncryptionService.decryptVaults(response.vaults)

        return {
          vaults: decryptedVaults,
          totalCount: response.totalCount
        }
      }

      return {
        vaults: [],
        totalCount: 0
      }
    } catch (error) {
      console.error('Failed to fetch vaults:', error)
      throw error
    }
  }

  /**
   * Gets a specific vault by ID and decrypts it
   * @param id Vault ID
   * @returns Decrypted vault
   */
  static async getVaultById(id: string): Promise<Vault> {
    try {
      const response = await this.fetchVaultById(id)
      return VaultEncryptionService.decryptVault(response)
    } catch (error) {
      console.error(`Failed to fetch vault with ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Creates a new vault with encrypted data
   * @param vaultData Vault data to create
   * @returns Created and decrypted vault
   */
  static async createNewVault(vaultData: {
    name: string
    description?: string
    icon?: string
  }): Promise<Vault> {
    try {
      const response = await this.createVault(vaultData)
      return VaultEncryptionService.decryptVault(response)
    } catch (error) {
      console.error('Failed to create vault:', error)
      throw error
    }
  }

  /**
   * Updates an existing vault with encrypted data
   * @param id Vault ID to update
   * @param vaultData Updated vault data
   * @returns Updated and decrypted vault
   */
  static async updateExistingVault(
    id: string,
    vaultData: { name: string; description?: string; icon?: string }
  ): Promise<Vault> {
    try {
      const response = await this.updateVault(id, vaultData)
      return VaultEncryptionService.decryptVault(response)
    } catch (error) {
      console.error(`Failed to update vault with ID ${id}:`, error)
      throw error
    }
  }
}
