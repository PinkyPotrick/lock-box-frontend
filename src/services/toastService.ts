import { useToast } from 'primevue/usetoast'
import { TOAST_LIFE_ERROR, TOAST_LIFE_WARNING } from '@/constants/appConstants'

export function useToastService() {
  const toast = useToast()

  /**
   * Handles error notifications with toast messages
   * @param error The error object or message
   * @param summary Optional custom summary text
   */
  const handleError = (error: any, summary = 'Failed') => {
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

  return {
    handleError,
    handleWarning
  }
}
