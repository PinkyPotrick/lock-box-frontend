import { useToast } from 'primevue/usetoast'
import {
  TOAST_LIFE_ERROR,
  TOAST_LIFE_WARNING,
  TOAST_LIFE_SUCCESS,
  TOAST_LIFE_INFO
} from '@/constants/appConstants'

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
    let errorMessage = 'An unknown error occurred.'

    if (error?.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error?.message) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    console.error('Error:', error)

    toast.add({
      severity: 'error',
      summary,
      detail: errorMessage,
      life: TOAST_LIFE_ERROR
    })
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
