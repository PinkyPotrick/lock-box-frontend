import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080',
  withCredentials: true, // Ensure cookies are sent with requests if needed for authentication
  timeout: 10000
})

// // Add a request interceptor to attach the token
// axiosInstance.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('auth_token')
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`
//     }
//     return config
//   },
//   (error) => Promise.reject(error)
// )

// // Add a response interceptor to handle errors
// axiosInstance.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // Token expired or unauthorized
//       localStorage.removeItem('auth_token')
//       localStorage.removeItem('user_id')
//       window.location.href = '/login' // Redirect to login page
//     }
//     return Promise.reject(error)
//   }
// )

export default axiosInstance
