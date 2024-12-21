// import { defineStore } from 'pinia'
// import { useStorage } from '@vueuse/core' // Optional, but useful for reactivity

// export const useUserStore = defineStore('user', {
//   state: () => ({
//     username: useStorage('username', ''), // Automatically persisted
//     email: useStorage('email', ''),
//     createdAt: useStorage('createdAt', '')
//   }),
//   actions: {
//     setUser(user: { username: string; email: string; createdAt: string }) {
//       this.username = user.username
//       this.email = user.email
//       this.createdAt = user.createdAt
//     }
//   },
//   persist: true // Automatically persists using the plugin
// })
