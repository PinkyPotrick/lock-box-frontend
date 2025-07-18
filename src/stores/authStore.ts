import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'
import { getCookies } from '@/utils/cookiesUtils'
import { AUTH } from '@/constants/appConstants'

interface User {
  username: string
  userId?: string
}

interface DecodedToken {
  sub: string
  displayName: string
  iat: number
  exp: number
}

function getStoredUser(): User | null {
  try {
    const userData = localStorage.getItem(AUTH.USER_STORAGE_KEY)
    return userData ? JSON.parse(userData) : null
  } catch (e) {
    console.error('Error retrieving stored user:', e)
    return null
  }
}

function getAuthToken(): string | null {
  const cookies = getCookies()
  return cookies?.get(AUTH.TOKEN_COOKIE_NAME)
}

function isLoggedIn(): boolean {
  return !!getAuthToken()
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    authToken: getAuthToken() as string | null,
    user: getStoredUser()
  }),
  getters: {
    isLoggedIn: (state) => !!state.authToken,
    currentUsername: (state) => state.user?.username || null
  },
  actions: {
    updateAuthToken() {
      this.authToken = getAuthToken()
      this.updateUserFromToken()
    },
    clearAuthToken() {
      this.authToken = null
    },
    setUser(userData: User) {
      this.user = userData
      localStorage.setItem(AUTH.USER_STORAGE_KEY, JSON.stringify(userData))
    },
    clearUser() {
      this.user = null
      localStorage.removeItem(AUTH.USER_STORAGE_KEY)
    },
    logout() {
      this.clearAuthToken()
      this.clearUser()
    },
    updateUserFromToken() {
      if (!this.authToken) {
        this.clearUser()
        return
      }

      try {
        const decoded = jwtDecode<DecodedToken>(this.authToken)
        this.setUser({
          username: decoded.displayName || 'User',
          userId: decoded.sub
        })
      } catch (error) {
        console.error('Error updating user from token:', error)
        this.clearUser()
      }
    }
  }
})

export { getAuthToken, isLoggedIn }
