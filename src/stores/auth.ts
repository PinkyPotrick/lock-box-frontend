import { getAuthToken } from '@/utils/auth'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    authToken: getAuthToken() as string | null
  }),
  getters: {
    isLoggedIn: (state) => !!state.authToken
  },
  actions: {
    updateAuthToken() {
      this.authToken = getAuthToken()
    },
    clearAuthToken() {
      this.authToken = null
    }
  }
})
