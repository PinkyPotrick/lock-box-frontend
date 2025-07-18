import {
  TOAST_LIFE_ERROR,
  TOAST_LIFE_INFO,
  TOAST_LIFE_SUCCESS,
  TOAST_LIFE_WARNING
} from '@/constants/appConstants'
import { useToast } from 'primevue/usetoast'
import { ApiErrorService } from './apiErrorService'

/**
 * Composable for handling toast notifications
 */
export function useToastService() {
  const toast = useToast()

  /**
   * Handles error notifications with toast messages
   * @param error The error object or message
   * @param summary Optional custom summary text
   */
  const handleError = (error: any, summary = 'Error') => {
    // Use ApiErrorService to extract error details
    const errorMessage = ApiErrorService.getErrorMessage(error)
    console.error('Error:', error)

    toast.add({
      severity: 'error',
      summary,
      detail: errorMessage,
      life: TOAST_LIFE_ERROR
    })

    // If it's an auth error, you might want to redirect to login or show a special message
    if (ApiErrorService.isAuthError(error)) {
      // Handle auth errors specifically if needed
      console.warn('Authentication error detected')
    }
  }

  /**
   * Handles warning notifications with toast messages
   * @param message The warning message
   * @param summary Optional custom summary text
   */
  const handleWarning = (message: string, summary = 'Warning') => {
    toast.add({
      severity: 'warn',
      summary,
      detail: message,
      life: TOAST_LIFE_WARNING
    })
  }

  /**
   * Handles success notifications with toast messages
   * @param message The success message
   * @param summary Optional custom summary text
   */
  const handleSuccess = (message: string, summary = 'Success') => {
    toast.add({
      severity: 'success',
      summary,
      detail: message,
      life: TOAST_LIFE_SUCCESS
    })
  }

  /**
   * Handles informational notifications with toast messages
   * @param message The info message
   * @param summary Optional custom summary text
   */
  const handleInfo = (message: string, summary = 'Information') => {
    toast.add({
      severity: 'info',
      summary,
      detail: message,
      life: TOAST_LIFE_INFO
    })
  }

  return {
    handleError,
    handleWarning,
    handleSuccess,
    handleInfo
  }
}
