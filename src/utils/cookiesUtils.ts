import type { VueCookies } from 'vue-cookies'
import type { App } from 'vue'

let cookies: VueCookies | null = null

// Initialize the cookies instance
export const initializeCookies = (app: App) => {
  cookies = app.config.globalProperties.$cookies
}

// Getter for the cookies instance
export const getCookies = (): VueCookies => {
  if (!cookies) {
    throw new Error(
      'Cookies have not been initialized. Make sure to call initializeCookies in main.ts.'
    )
  }
  return cookies
}
