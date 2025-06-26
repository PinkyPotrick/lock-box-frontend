import type { ApiError } from '@/services/apiErrorService'
import { SensitiveOperationService } from '@/services/sensitiveOperationService'
import { useToastService } from '@/services/toastService'
import { ref } from 'vue'

export function useTOTPOperation() {
  const showTOTPDialog = ref(false)
  const pendingOperation = ref<(() => void) | null>(null)
  const { handleWarning } = useToastService()

  /**
   * Ensures the operation is authorized with TOTP validation if required
   * @param operationType Type of operation being performed
   * @param operation Function to execute if authorized
   * @returns Promise that resolves when the operation completes
   */
  const withTOTPVerification = async <T>(
    operationType: string,
    operation: () => T | Promise<T> | void
  ): Promise<T | undefined | void> => {
    try {
      // Check if TOTP is locked out first
      if (SensitiveOperationService.isTOTPLockedOut()) {
        const remainingTime = SensitiveOperationService.getTOTPLockoutRemainingTime()
        const minutes = Math.ceil(remainingTime / 60000)
        handleWarning(
          `TOTP verification is locked due to too many failed attempts. Please try again in ${minutes} minutes.`,
          'Security Feature Locked'
        )
        return undefined
      }

      // Check if TOTP is enabled for the user
      if (!(await SensitiveOperationService.isTOTPEnabled())) {
        // If TOTP is not enabled, execute operation immediately
        return await operation()
      }

      // Store the operation so we can execute it after verification
      pendingOperation.value = operation as any

      // Check if operation already authorized or needs verification
      const isAuthorized = await SensitiveOperationService.ensureOperationAuthorized(
        operationType,
        async () => {
          // Show dialog and wait for verification
          showTOTPDialog.value = true
          return new Promise<boolean>((resolve) => {
            // This will be resolved by the dialog component via events
            pendingResolve = resolve
          })
        }
      )

      // If already authorized, execute immediately
      if (isAuthorized && pendingOperation.value) {
        const result = await pendingOperation.value()
        pendingOperation.value = null
        return result
      }

      return undefined
    } catch (error) {
      const apiError = error as ApiError
      if (apiError?.errorType === 'TOTP_LOCKED_OUT') {
        const remainingTime = SensitiveOperationService.getTOTPLockoutRemainingTime()
        const minutes = Math.ceil(remainingTime / 60000)
        handleWarning(
          `TOTP verification is locked due to too many failed attempts. Please try again in ${minutes} minutes.`,
          'Security Feature Locked'
        )
        return undefined
      }

      throw error
    }
  }

  // Callback when TOTP verification is successful
  let pendingResolve: ((value: boolean) => void) | null = null

  const handleTOTPVerified = () => {
    if (pendingResolve) {
      pendingResolve(true)
      pendingResolve = null
    }

    if (pendingOperation.value) {
      pendingOperation.value()
      pendingOperation.value = null
    }
  }

  // Callback when TOTP verification is cancelled
  const handleTOTPCancelled = () => {
    if (pendingResolve) {
      pendingResolve(false)
      pendingResolve = null
    }

    pendingOperation.value = null

    // Show warning toast when user cancels verification
    handleWarning(
      'Operation cancelled due to security verification denial',
      'Security Verification Required'
    )
  }

  return {
    showTOTPDialog,
    withTOTPVerification,
    handleTOTPVerified,
    handleTOTPCancelled
  }
}
