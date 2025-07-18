import axios from 'axios'
import { getAuthToken } from '@/stores/authStore'

const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true, // Ensure cookies are sent with requests if needed for authentication
  timeout: 30000
})

// Add a request interceptor to include the auth token in all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    if (token) {
      // This is the key line - make sure you're setting the header correctly
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default axiosInstance
