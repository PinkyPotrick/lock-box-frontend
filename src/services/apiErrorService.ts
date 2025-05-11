import axios, { AxiosError } from 'axios'

/**
 * Custom error class for API errors with additional context
 */
export class ApiError extends Error {
  statusCode: number
  errorType: string
  timestamp?: any

  constructor(message: string, statusCode = 400, errorType = 'API Error', timestamp?: any) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.errorType = errorType
    this.timestamp = timestamp
  }
}

/**
 * Service for handling API errors consistently across the application
 */
export class ApiErrorService {
  /**
   * Handles API error responses and extracts useful information
   * @param error Error object from axios
   * @returns Standardized ApiError
   */
  static handleError(error: any): ApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>

      if (axiosError.response?.data) {
        const { message, statusCode, errorType, timestamp } = axiosError.response.data

        // Use the server-provided error details if available
        if (message) {
          return new ApiError(
            message,
            statusCode || axiosError.response.status,
            errorType || 'API Error',
            timestamp
          )
        }
      }

      // Handle other Axios errors
      const statusCode = axiosError.response?.status || 500
      const message = axiosError.message || 'Network or server error'

      return new ApiError(message, statusCode)
    }

    // Handle non-Axios errors
    if (error instanceof Error) {
      return new ApiError(error.message, 500, 'Client Error')
    }

    // Default error handling for unknown error types
    return new ApiError('An unknown error occurred', 500, 'Unknown Error')
  }

  /**
   * Extracts a user-friendly message from an error
   * @param error Any error object
   * @returns User-friendly error message
   */
  static getErrorMessage(error: any): string {
    if (error instanceof ApiError) {
      return error.message
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>
      if (axiosError.response?.data?.message) {
        return axiosError.response.data.message
      }
      return axiosError.message || 'Network or server error'
    }

    if (error instanceof Error) {
      return error.message
    }

    return 'An unknown error occurred'
  }

  /**
   * Checks if the error is related to authentication
   * @param error Any error object
   * @returns True if it's an auth error
   */
  static isAuthError(error: any): boolean {
    if (error instanceof ApiError) {
      return error.statusCode === 401 || error.statusCode === 403
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError
      return axiosError.response?.status === 401 || axiosError.response?.status === 403
    }

    return false
  }

  /**
   * Checks if the error is a validation error
   * @param error Any error object
   * @returns True if it's a validation error
   */
  static isValidationError(error: any): boolean {
    if (error instanceof ApiError) {
      return error.errorType.toLowerCase().includes('validation') || error.statusCode === 400
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>
      return (
        axiosError.response?.status === 400 &&
        axiosError.response.data?.errorType?.toLowerCase().includes('validation')
      )
    }

    return false
  }
}
