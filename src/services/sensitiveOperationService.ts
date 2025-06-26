import axios from '@/axios-config'
import { API_PATHS } from '@/constants/apiPaths'
import {
  AUTH_ERROR_MESSAGES,
  ERROR_TYPES,
  GENERIC_ERROR_MESSAGES,
  HTTP_STATUS
} from '@/constants/appConstants'
import { ProfileService } from '@/services/profileService'
import { getAuthToken } from '@/stores/authStore'
import { ApiError, ApiErrorService } from './apiErrorService'
import { TOTPService } from './totpService'

/**
 * Service for handling authorization for sensitive operations
 */
export class SensitiveOperationService {
  // Track when TOTP was last validated
  private static lastTOTPValidation: number = 0
  // Default validity period for TOTP (2 minutes in ms)
  private static readonly VALIDITY_MINUITES: number = 2
  // Default window for TOTP validity
  private static readonly TOTP_VALIDITY_WINDOW: number = this.VALIDITY_MINUITES * 60 * 1000
  // Risk level that requires TOTP verification
  private static readonly HIGH_RISK_LEVEL: string = 'HIGH'
  // Track if TOTP is enabled for the current user
  private static totpEnabled: boolean | null = null
  // Track if inactivity monitor is set up
  private static inactivityMonitorSetup: boolean = false
  // TOTP attempts tracking
  private static totpAttempts: number = 0
  private static readonly MAX_TOTP_ATTEMPTS: number = 3
  private static readonly LOCKOUT_MINUTES: number = 5 // Lockout duration in minutes (5 minutes)
  private static totpLockedUntil: number | null = null
  private static readonly LOCKOUT_DURATION: number = this.LOCKOUT_MINUTES * 60 * 1000

  // Add this method to check if user is logged in
  private static isUserAuthenticated(): boolean {
    const authToken = getAuthToken()
    return !!authToken
  }

  /**
   * Check if TOTP is enabled for the current user
   * @param forceCheck Set to true to force a fresh check from the API
   * @returns Promise resolving to true if TOTP is enabled
   */
  static async isTOTPEnabled(forceCheck = false): Promise<boolean> {
    // If user is not authenticated, TOTP is not enabled
    if (!this.isUserAuthenticated()) {
      // Clean up any lingering TOTP data when checking without authentication
      this.totpEnabled = false
      TOTPService.cleanupTOTPSessionData()
      return false
    }

    // Always fetch fresh data if requested
    if (forceCheck) {
      try {
        const profile = await ProfileService.fetchUserProfile()
        this.totpEnabled = profile.totpEnabled === true
        return this.totpEnabled
      } catch (error) {
        return false
      }
    }

    // Use cached value if available
    if (this.totpEnabled !== null) {
      return this.totpEnabled
    }

    try {
      const profile = await ProfileService.fetchUserProfile()
      this.totpEnabled = profile.totpEnabled === true
      return this.totpEnabled
    } catch (error) {
      return false
    }
  }

  /**
   * Reset TOTP enabled status (call when user logs out)
   */
  static resetTOTPEnabledStatus(): void {
    this.totpEnabled = null
  }

  /**
   * Verifies if the current session has recent TOTP validation
   * @returns True if TOTP is still valid, false if verification needed
   */
  static hasTOTPValidation(): boolean {
    const now = Date.now()
    return now - this.lastTOTPValidation < this.TOTP_VALIDITY_WINDOW
  }

  /**
   * Updates the TOTP validation timestamp after successful verification
   */
  static updateTOTPValidation(): void {
    this.lastTOTPValidation = Date.now()

    // Also store in sessionStorage as fallback across page refreshes
    sessionStorage.setItem('last_totp_validation', this.lastTOTPValidation.toString())
  }

  /**
   * Resets the TOTP validation status
   */
  static resetTOTPValidation(): void {
    this.lastTOTPValidation = 0
    sessionStorage.removeItem('last_totp_validation')
  }

  /**
   * Set up event listener for TOTP status changes
   */
  private static setupTOTPStatusListener(): void {
    window.addEventListener('totp-status-changed', (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
        this.setTOTPEnabled(customEvent.detail.enabled)
      } else {
        // If no specific status is provided, force a refresh
        this.isTOTPEnabled(true)

        // Reset validation to force verification
        this.resetTOTPValidation()
      }
    })
  }

  /**
   * Initializes the TOTP validation from session storage (if exists)
   * Call this on app initialization
   */
  static initializeTOTPValidation(): void {
    const storedValidation = sessionStorage.getItem('last_totp_validation')
    if (storedValidation) {
      this.lastTOTPValidation = parseInt(storedValidation, 10)
    }

    // Initialize TOTP attempts if user is authenticated
    if (this.isUserAuthenticated()) {
      this.initializeTOTPAttempts()
    } else {
      // Clean up any lingering TOTP data if not authenticated
      TOTPService.cleanupTOTPSessionData()
    }

    // Set up the inactivity monitor when initializing
    this.setupInactivityMonitor()

    // Listen for TOTP status changes
    this.setupTOTPStatusListener()
  }

  /**
   * Verifies TOTP code for sensitive operations
   * @param code TOTP verification code
   * @returns Success status
   */
  static async verifyOperationTOTP(code: string): Promise<boolean> {
    // Check if TOTP is locked out
    if (this.isTOTPLockedOut()) {
      const remainingTime = this.getTOTPLockoutRemainingTime()
      throw new ApiError(
        `TOTP verification locked. Please wait ${Math.ceil(remainingTime / 60000)} minutes before trying again.`,
        HTTP_STATUS.TOO_MANY_REQUESTS,
        'TOTP_LOCKED_OUT'
      )
    }

    const token = getAuthToken()

    if (!token) {
      throw new ApiError(
        GENERIC_ERROR_MESSAGES.AUTH_TOKEN_MISSING,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_TYPES.AUTH_ERROR
      )
    }

    try {
      const response = await axios.post<{
        item: boolean
        message?: string
      }>(
        API_PATHS.USERS.VERIFY_OPERATION_TOTP,
        { code },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (response.data && !response.data.item) {
        // Increment failed attempts
        this.incrementTOTPAttempts()

        throw new ApiError(
          response.data.message || AUTH_ERROR_MESSAGES.TOTP_INVALID,
          HTTP_STATUS.BAD_REQUEST,
          ERROR_TYPES.API_ERROR
        )
      }

      // Update the validation timestamp on successful verification
      this.updateTOTPValidation()
      return true
    } catch (error) {
      throw ApiErrorService.handleError(error)
    }
  }

  /**
   * Increment TOTP attempts counter and lock if max reached
   */
  private static incrementTOTPAttempts(): void {
    this.totpAttempts++

    // Store in session storage for persistence
    sessionStorage.setItem('totp_attempts', this.totpAttempts.toString())

    console.log(`TOTP attempts incremented to ${this.totpAttempts}/${this.MAX_TOTP_ATTEMPTS}`)

    // Check if max attempts reached
    if (this.totpAttempts >= this.MAX_TOTP_ATTEMPTS) {
      this.lockoutTOTP()
    }
  }

  /**
   * Reset TOTP attempts counter
   */
  private static resetTOTPAttempts(): void {
    this.totpAttempts = 0
    sessionStorage.removeItem('totp_attempts')
    console.log('TOTP attempts reset')
  }

  /**
   * Lock TOTP verification for the lockout period
   */
  private static lockoutTOTP(): void {
    const lockoutUntil = Date.now() + this.LOCKOUT_DURATION
    this.totpLockedUntil = lockoutUntil
    sessionStorage.setItem('totp_locked_until', lockoutUntil.toString())
    console.log(`TOTP locked out until ${new Date(lockoutUntil).toLocaleTimeString()}`)
  }

  /**
   * Check if TOTP verification is currently locked out
   */
  static isTOTPLockedOut(): boolean {
    // Try to get lockout time from storage if not set in memory
    if (!this.totpLockedUntil) {
      const storedLockout = sessionStorage.getItem('totp_locked_until')
      if (storedLockout) {
        this.totpLockedUntil = parseInt(storedLockout, 10)
      }
    }

    // If lockout time exists, check if it's still active
    if (this.totpLockedUntil) {
      const now = Date.now()
      if (now < this.totpLockedUntil) {
        return true
      } else {
        // Reset lockout if expired
        this.totpLockedUntil = null
        sessionStorage.removeItem('totp_locked_until')
        this.resetTOTPAttempts()
        return false
      }
    }

    return false
  }

  /**
   * Get remaining lockout time in milliseconds
   */
  static getTOTPLockoutRemainingTime(): number {
    if (!this.totpLockedUntil) {
      const storedLockout = sessionStorage.getItem('totp_locked_until')
      if (storedLockout) {
        this.totpLockedUntil = parseInt(storedLockout, 10)
      } else {
        return 0
      }
    }

    const remaining = Math.max(0, this.totpLockedUntil - Date.now())
    return remaining
  }

  /**
   * Get current attempt count
   */
  static getTOTPAttempts(): number {
    if (this.totpAttempts === 0) {
      const storedAttempts = sessionStorage.getItem('totp_attempts')
      if (storedAttempts) {
        this.totpAttempts = parseInt(storedAttempts, 10)
      }
    }
    return this.totpAttempts
  }

  /**
   * Initialize TOTP attempts from session storage
   */
  static initializeTOTPAttempts(): void {
    const storedAttempts = sessionStorage.getItem('totp_attempts')
    if (storedAttempts) {
      this.totpAttempts = parseInt(storedAttempts, 10)
    } else {
      this.totpAttempts = 0
    }

    // Also check for existing lockout
    const storedLockout = sessionStorage.getItem('totp_locked_until')
    if (storedLockout) {
      this.totpLockedUntil = parseInt(storedLockout, 10)

      // If lockout has expired, clear it
      if (Date.now() > this.totpLockedUntil) {
        this.totpLockedUntil = null
        sessionStorage.removeItem('totp_locked_until')
        this.resetTOTPAttempts()
      }
    }
  }

  /**
   * Ensures operation is authorized, showing TOTP dialog if needed
   * @param operation The operation type to authorize
   * @param showTOTPDialog Function to display TOTP dialog
   * @returns Promise resolving to true if authorized
   */
  static async ensureOperationAuthorized(
    operation: string,
    showTOTPDialog: () => Promise<boolean>
  ): Promise<boolean> {
    try {
      // First check if TOTP is locked out
      if (this.isTOTPLockedOut()) {
        const remainingTime = this.getTOTPLockoutRemainingTime()
        const minutes = Math.ceil(remainingTime / 60000)
        throw new ApiError(
          `TOTP verification is locked. Please try again in ${minutes} minutes.`,
          HTTP_STATUS.TOO_MANY_REQUESTS,
          'TOTP_LOCKED_OUT'
        )
      }

      // Force a fresh check for high-risk operations
      const isHighRisk = this.getOperationRiskLevel(operation) === this.HIGH_RISK_LEVEL

      // Check if TOTP is enabled for the user - force check for high-risk operations
      const totpEnabled = await this.isTOTPEnabled(isHighRisk)

      // If TOTP is not enabled, always authorize the operation
      if (!totpEnabled) {
        return true
      }

      // For high risk operations, ensure TOTP verification
      if (isHighRisk) {
        // If TOTP validation has expired, request new verification
        if (!this.hasTOTPValidation()) {
          return await showTOTPDialog()
        }
      }

      // Already verified or not needed
      return true
    } catch (error) {
      // Add error handling for backend TOTP requirements
      const apiError = error as ApiError

      if (apiError?.errorType === 'TOTP_LOCKED_OUT') {
        throw error
      }

      if (
        apiError?.message?.includes('TOTP verification required') ||
        apiError?.errorType === 'TOTP_VERIFICATION_REQUIRED'
      ) {
        // Backend requires TOTP verification
        return await showTOTPDialog()
      }

      throw error
    }
  }

  /**
   * Determines the risk level of an operation
   * @param operation Operation type
   * @returns Risk level (HIGH, MEDIUM, LOW)
   */
  private static getOperationRiskLevel(operation: string): string {
    // High risk operations that require TOTP
    const highRiskOperations = [
      'VIEW_CREDENTIALS_LIST',
      'VIEW_CREDENTIAL',
      'DELETE_CREDENTIAL',
      'EDIT_CREDENTIAL',
      'DELETE_VAULT',
      'CHANGE_PASSWORD'
    ]

    if (highRiskOperations.includes(operation)) {
      return this.HIGH_RISK_LEVEL
    }

    return 'MEDIUM' // Default to medium risk
  }

  /**
   * Explicitly set the TOTP enabled status
   * @param enabled True if TOTP is enabled
   */
  static setTOTPEnabled(enabled: boolean): void {
    this.totpEnabled = enabled
    console.log(`TOTP enabled status set to: ${enabled}`)

    // If TOTP was just enabled, reset the validation status
    // This will force users to enter TOTP for the first operation after enabling
    if (enabled) {
      this.resetTOTPValidation()
    }
  }

  private static setupInactivityMonitor() {
    // Check if already set up to prevent duplicate event listeners
    if (this.inactivityMonitorSetup) {
      return
    }

    let timeout: ReturnType<typeof setTimeout> | null = null

    const resetTimeout = () => {
      if (timeout) {
        clearTimeout(timeout)
      }

      // Reset validation after 2 minutes of inactivity
      timeout = setTimeout(
        () => {
          this.resetTOTPValidation()
        },
        this.VALIDITY_MINUITES * 60 * 1000
      )
    }

    // Monitor user activity
    window.addEventListener('mousemove', resetTimeout)
    window.addEventListener('keydown', resetTimeout)
    window.addEventListener('click', resetTimeout)

    // Initial timeout
    resetTimeout()

    // Mark as set up
    this.inactivityMonitorSetup = true
  }
}
