import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'

export class SecureApiService {
  /**
   * Fetches the server's public key
   * @returns The public key string
   */
  static async fetchPublicKey(): Promise<string> {
    const response = await axios.get(API_PATHS.AUTH.PUBLIC_KEY)
    return response?.data?.item
  }
}
