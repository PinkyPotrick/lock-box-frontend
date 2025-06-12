<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="profile">
    <p-toast />
    <h2>User Profile</h2>

    <!-- Profile Information Card -->
    <p-card class="mb-4">
      <template #header>
        <div class="profile-header">
          <i class="pi pi-user profile-icon"></i>
          <h3>Profile Information</h3>
        </div>
      </template>
      <template #content>
        <div class="profile-content" v-if="loading">
          <p-progress-spinner style="width: 50px" strokeWidth="4" />
          <span class="loading-text">Loading profile data...</span>
        </div>
        <div class="profile-content" v-else>
          <div class="profile-field">
            <span class="field-label">Username:</span>
            <span class="field-value">{{ user.username }}</span>
          </div>
          <div class="profile-field">
            <span class="field-label">Email:</span>
            <span class="field-value">{{ user.email }}</span>
          </div>
          <div class="profile-field">
            <span class="field-label">Member Since:</span>
            <span class="field-value">{{ formatDate(user.createdAt) }}</span>
          </div>
          <div class="profile-field" v-if="user.updatedAt">
            <span class="field-label">Last Updated:</span>
            <span class="field-value">{{ formatDate(user.updatedAt) }}</span>
          </div>
        </div>
      </template>
    </p-card>

    <!-- Password Change Card -->
    <p-card>
      <template #header>
        <div class="profile-header">
          <i class="pi pi-key profile-icon"></i>
          <h3>Change Password</h3>
        </div>
      </template>
      <template #content>
        <div class="security-content">
          <!-- Simple Custom Stepper -->
          <div class="custom-stepper">
            <div class="step-indicators">
              <div
                class="step-indicator"
                :class="{ active: currentStep >= 1, completed: currentStep > 1 }"
              >
                <div class="step-number">1</div>
                <div class="step-label">Verify current password</div>
              </div>
              <div
                class="step-indicator"
                :class="{ active: currentStep >= 2, completed: currentStep > 2 }"
              >
                <div class="step-number">2</div>
                <div class="step-label">Set new password</div>
              </div>
              <div
                class="step-indicator"
                :class="{ active: currentStep >= 3, completed: currentStep > 3 }"
              >
                <div class="step-number">3</div>
                <div class="step-label">Complete</div>
              </div>
            </div>

            <!-- Step 1: Current Password -->
            <div v-if="currentStep === 1" class="step-content">
              <div class="form-field">
                <label for="currentPassword" class="required">Current Password</label>
                <p-password
                  id="currentPassword"
                  v-model="passwordForm.currentPassword"
                  :feedback="false"
                  :toggleMask="true"
                  :class="{
                    'p-invalid':
                      v$.passwordForm.currentPassword.$invalid &&
                      v$.passwordForm.currentPassword.$dirty
                  }"
                  @blur="v$.passwordForm.currentPassword.$touch()"
                  :disabled="passwordChanging"
                />
                <small
                  v-if="
                    v$.passwordForm.currentPassword.$invalid &&
                    v$.passwordForm.currentPassword.$dirty
                  "
                  class="p-error"
                >
                  {{ v$.passwordForm.currentPassword.$errors[0].$message }}
                </small>
              </div>

              <div class="form-actions">
                <p-button
                  type="button"
                  label="Next"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  class="p-button-success"
                  :loading="passwordChanging"
                  :disabled="passwordChanging || v$.passwordForm.currentPassword.$invalid"
                  @click="validateCurrentPassword"
                />
              </div>
            </div>

            <!-- Step 2: New Password -->
            <div v-if="currentStep === 2" class="step-content">
              <div class="form-field">
                <label for="newPassword" class="required">New Password</label>
                <p-password
                  id="newPassword"
                  v-model="passwordForm.newPassword"
                  :toggleMask="true"
                  :class="{
                    'p-invalid':
                      v$.passwordForm.newPassword.$invalid && v$.passwordForm.newPassword.$dirty
                  }"
                  @blur="v$.passwordForm.newPassword.$touch()"
                  :disabled="passwordChanging"
                >
                  <template #footer>
                    <div class="password-requirements">
                      <h5>Password Requirements:</h5>
                      <ul class="p-0 m-0 pl-2">
                        <li :class="{ 'requirement-met': passwordMeetsLength }">
                          <i class="pi" :class="passwordMeetsLength ? 'pi-check' : 'pi-times'"></i>
                          Minimum 8 characters
                        </li>
                        <li :class="{ 'requirement-met': passwordHasUppercase }">
                          <i class="pi" :class="passwordHasUppercase ? 'pi-check' : 'pi-times'"></i>
                          At least one uppercase letter
                        </li>
                        <li :class="{ 'requirement-met': passwordHasLowercase }">
                          <i class="pi" :class="passwordHasLowercase ? 'pi-check' : 'pi-times'"></i>
                          At least one lowercase letter
                        </li>
                        <li :class="{ 'requirement-met': passwordHasDigit }">
                          <i class="pi" :class="passwordHasDigit ? 'pi-check' : 'pi-times'"></i>
                          At least one number
                        </li>
                        <li :class="{ 'requirement-met': passwordHasSpecial }">
                          <i class="pi" :class="passwordHasSpecial ? 'pi-check' : 'pi-times'"></i>
                          At least one special character
                        </li>
                      </ul>
                    </div>
                  </template>
                </p-password>
                <small
                  v-if="v$.passwordForm.newPassword.$invalid && v$.passwordForm.newPassword.$dirty"
                  class="p-error"
                >
                  {{ v$.passwordForm.newPassword.$errors[0].$message }}
                </small>
              </div>

              <div class="form-field">
                <label for="confirmPassword" class="required">Confirm New Password</label>
                <p-password
                  id="confirmPassword"
                  v-model="passwordForm.confirmPassword"
                  :feedback="false"
                  :toggleMask="true"
                  :class="{
                    'p-invalid':
                      v$.passwordForm.confirmPassword.$invalid &&
                      v$.passwordForm.confirmPassword.$dirty
                  }"
                  @blur="v$.passwordForm.confirmPassword.$touch()"
                  :disabled="passwordChanging"
                />
                <small
                  v-if="
                    v$.passwordForm.confirmPassword.$invalid &&
                    v$.passwordForm.confirmPassword.$dirty
                  "
                  class="p-error"
                >
                  {{ v$.passwordForm.confirmPassword.$errors[0].$message }}
                </small>
              </div>

              <div class="form-actions">
                <p-button
                  type="button"
                  label="Back"
                  icon="pi pi-arrow-left"
                  class="p-button-text p-button-success"
                  @click="currentStep = 1"
                  :disabled="passwordChanging"
                />
                <p-button
                  type="button"
                  label="Change Password"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  class="p-button-success"
                  :loading="passwordChanging"
                  :disabled="
                    passwordChanging ||
                    v$.passwordForm.newPassword.$invalid ||
                    v$.passwordForm.confirmPassword.$invalid
                  "
                  @click="validateNewPassword"
                />
              </div>
            </div>

            <!-- Step 3: Success -->
            <div v-if="currentStep === 3" class="step-content">
              <div class="password-change-success">
                <i class="pi pi-check-circle"></i>
                <h4>Password Changed Successfully</h4>
                <p>Your password has been updated. You can now use your new password for login.</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </p-card>

    <!-- Two-Factor Authentication (2FA) Card -->
    <p-card class="totp-card">
      <template #header>
        <div class="profile-header">
          <i class="pi pi-shield profile-icon"></i>
          <h3>Two-Factor Authentication (2FA)</h3>
        </div>
      </template>
      <template #content>
        <div class="totp-content">
          <!-- 2FA Status -->
          <div v-if="!setupMode" class="totp-status">
            <div class="status-indicator" :class="{ enabled: user.totpEnabled }">
              <i
                :class="user.totpEnabled ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'"
              ></i>
              <span>2FA is {{ user.totpEnabled ? 'Enabled' : 'Disabled' }}</span>
            </div>

            <div v-if="!user.totpEnabled" class="security-alert">
              <i class="pi pi-shield"></i>
              <div class="alert-text">
                <strong>Enhance Your Account Security</strong>
                <p>
                  Two-factor authentication adds an extra layer of security to your account by
                  requiring a verification code in addition to your password.
                </p>
              </div>
            </div>

            <div class="totp-actions">
              <p-button
                v-if="!user.totpEnabled"
                icon="pi pi-lock"
                label="Set up 2FA"
                @click="startSetup"
                class="p-button-success"
              ></p-button>

              <p-button
                v-else
                icon="pi pi-unlock"
                label="Disable 2FA"
                @click="confirmDisable"
                class="p-button-danger"
                :disabled="disabling"
              ></p-button>
            </div>
          </div>

          <!-- TOTP Setup Mode -->
          <div v-if="setupMode" class="totp-setup">
            <!-- Step 1: Scan QR Code -->
            <div v-if="setupStep === 1" class="setup-step">
              <h4>Step 1: Scan QR Code</h4>
              <div class="qr-container">
                <div v-if="loading" class="qr-loading">
                  <p-progress-spinner style="width: 50px" strokeWidth="4" />
                  <span>Generating your secure key...</span>
                </div>
                <div v-else>
                  <img
                    v-if="totpSetup.qrCodeUrl"
                    :src="totpSetup.qrCodeUrl"
                    alt="QR Code"
                    class="qr-code"
                  />
                  <div class="manual-key">
                    <p>If you can't scan the QR code, enter this key manually:</p>
                    <div class="key-display">
                      <span>{{ totpSetup.manualEntryKey }}</span>
                      <p-button
                        icon="pi pi-copy"
                        @click="copyToClipboard(totpSetup.manualEntryKey)"
                        class="p-button-text p-button-rounded"
                      ></p-button>
                    </div>
                  </div>
                  <div class="instructions">
                    <p>
                      1. Install an authenticator app like Google Authenticator, Microsoft
                      Authenticator, or Authy
                    </p>
                    <p>2. Scan the QR code or enter the key manually</p>
                    <p>3. Click Next to verify your setup</p>
                  </div>
                </div>
              </div>
              <div class="setup-actions">
                <p-button
                  label="Cancel"
                  icon="pi pi-times"
                  @click="cancelSetup"
                  class="p-button-text"
                ></p-button>
                <p-button
                  label="Next"
                  icon="pi pi-arrow-right"
                  @click="setupStep = 2"
                  :disabled="loading || !totpSetup.qrCodeUrl"
                  class="p-button-success"
                  iconPos="right"
                ></p-button>
              </div>
            </div>

            <!-- Step 2: Verify Code -->
            <div v-if="setupStep === 2" class="setup-step">
              <h4>Step 2: Verify Code</h4>
              <div class="verification-container">
                <p>Enter the 6-digit code from your authenticator app to verify your setup</p>
                <div class="code-input">
                  <label for="verification-code">Verification Code</label>
                  <p-input-text
                    id="verification-code"
                    v-model="verificationCode"
                    placeholder="Enter 6-digit code"
                    :class="{ 'p-invalid': verificationError }"
                    maxlength="6"
                    keyfilter="int"
                  ></p-input-text>
                  <small v-if="verificationError" class="p-error">{{ verificationError }}</small>
                </div>
              </div>
              <div class="setup-actions">
                <p-button
                  label="Back"
                  icon="pi pi-arrow-left"
                  @click="setupStep = 1"
                  class="p-button-text"
                ></p-button>
                <p-button
                  label="Verify & Enable"
                  icon="pi pi-check"
                  @click="verifyAndEnableTotp"
                  :loading="verifying"
                  :disabled="verifying || verificationCode.length !== 6"
                  class="p-button-success"
                ></p-button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </p-card>

    <!-- Add confirm dialog for disabling 2FA -->
    <p-confirm-dialog></p-confirm-dialog>
  </div>
</template>

<script lang="ts">
import {
  PASSWORD_CHANGE_ERROR_MESSAGES,
  PASSWORD_CHANGE_INFO_MESSAGES,
  PASSWORD_CHANGE_SUCCESS_MESSAGES,
  PROFILE_ERROR_MESSAGES,
  PROFILE_SUCCESS_MESSAGES
} from '@/constants/appConstants'
import type { User } from '@/models/user'
import router from '@/router'
import { handleLogout } from '@/services/authService'
import { PasswordChangeService } from '@/services/passwordChangeService'
import { ProfileService } from '@/services/profileService'
import { useToastService } from '@/services/toastService'
import { useAuthStore } from '@/stores/authStore'
import { useVuelidate } from '@vuelidate/core'
import { helpers, required } from '@vuelidate/validators'
import { useConfirm } from 'primevue/useconfirm'
import { computed, defineComponent, onMounted, ref, watch } from 'vue'
// Import new dependencies
import type { TOTPSetupResponse } from '@/models/user'
import { TOTPService } from '@/services/totpService'

// Define password validation rules
const createPasswordValidator = (message: string) => {
  return helpers.withMessage(message, (value: string) => {
    if (!value) return false
    return (
      value.length >= 8 && // Min length
      /[A-Z]/.test(value) && // Uppercase
      /[a-z]/.test(value) && // Lowercase
      /[0-9]/.test(value) && // Digit
      /[^A-Za-z0-9]/.test(value) // Special character
    )
  })
}

export default defineComponent({
  setup() {
    const loading = ref(true)
    const authStore = useAuthStore()
    const { handleError, handleSuccess, handleInfo } = useToastService()
    const confirm = useConfirm()

    // Initialize user with data from authStore
    const user = ref<User>({
      username: authStore.user?.username || '',
      email: '',
      createdAt: new Date().toISOString(),
      updatedAt: undefined
    })

    // Password change state
    const currentStep = ref(1)
    const passwordChanging = ref(false)
    const passwordForm = ref({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })

    // SRP state between steps
    const srpState = ref({
      clientPrivateValueA: null as bigint | null,
      clientPublicValueA: null as bigint | null,
      serverPublicValueB: null as string | null,
      salt: null as string | null,
      helperAesKey: null as string | null
    })

    // Password validation helpers
    const passwordMeetsLength = computed(() => passwordForm.value.newPassword.length >= 8)
    const passwordHasUppercase = computed(() => /[A-Z]/.test(passwordForm.value.newPassword))
    const passwordHasLowercase = computed(() => /[a-z]/.test(passwordForm.value.newPassword))
    const passwordHasDigit = computed(() => /[0-9]/.test(passwordForm.value.newPassword))
    const passwordHasSpecial = computed(() => /[^A-Za-z0-9]/.test(passwordForm.value.newPassword))

    // Reset password change process
    const resetPasswordChange = () => {
      currentStep.value = 1
      passwordForm.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      v$.value.$reset()
      srpState.value = {
        clientPrivateValueA: null,
        clientPublicValueA: null,
        serverPublicValueB: null,
        salt: null,
        helperAesKey: null
      }
    }

    // Validation rules with dynamic sameAs reference
    const rules = {
      passwordForm: {
        currentPassword: {
          required: helpers.withMessage('Current password is required', required)
        },
        newPassword: {
          required: helpers.withMessage('New password is required', required),
          complex: createPasswordValidator('Password does not meet security requirements')
        },
        confirmPassword: {
          required: helpers.withMessage('Please confirm your new password', required),
          sameAsPassword: helpers.withMessage(
            'Passwords do not match',
            (value) => value === passwordForm.value.newPassword
          )
        }
      }
    }

    const v$ = useVuelidate(rules, { passwordForm })

    // Watch for password changes to update validation
    watch(
      () => passwordForm.value.newPassword,
      () => {
        if (v$.value.passwordForm.confirmPassword.$dirty) {
          v$.value.passwordForm.confirmPassword.$validate()
        }
      }
    )

    const fetchUserProfile = async () => {
      try {
        loading.value = true
        const profileData = await ProfileService.fetchUserProfile()

        user.value = {
          ...user.value,
          ...profileData,
          username: user.value.username
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
        handleError(error, 'Profile Error')
      } finally {
        loading.value = false
      }
    }

    // Handle step 1: validate current password
    const validateCurrentPassword = async () => {
      try {
        await v$.value.passwordForm.currentPassword.$validate()
        if (v$.value.passwordForm.currentPassword.$invalid) return

        passwordChanging.value = true

        // Initiate password change process
        const initResult = await PasswordChangeService.initiatePasswordChange(
          user.value.username,
          passwordForm.value.currentPassword
        )

        // Store SRP values for next step
        srpState.value = {
          ...srpState.value,
          ...initResult
        }

        // Move to step 2
        currentStep.value = 2
      } catch (error) {
        console.error('Password verification failed:', error)
        handleError(error, PASSWORD_CHANGE_ERROR_MESSAGES.CURRENT_PASSWORD_INCORRECT)
      } finally {
        passwordChanging.value = false
      }
    }

    // Handle step 2: validate and set new password
    const validateNewPassword = async () => {
      try {
        await v$.value.passwordForm.newPassword.$validate()
        await v$.value.passwordForm.confirmPassword.$validate()

        if (
          v$.value.passwordForm.newPassword.$invalid ||
          v$.value.passwordForm.confirmPassword.$invalid
        ) {
          return
        }

        passwordChanging.value = true

        // Complete password change with SRP values from step 1
        await PasswordChangeService.completePasswordChange(
          user.value.username,
          passwordForm.value.currentPassword,
          passwordForm.value.newPassword,
          srpState.value
        )

        // Clear sensitive data
        passwordForm.value = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }

        // Clear SRP state
        srpState.value = {
          clientPrivateValueA: null,
          clientPublicValueA: null,
          serverPublicValueB: null,
          salt: null,
          helperAesKey: null
        }

        // Move to success step
        currentStep.value = 3
        handleSuccess(PASSWORD_CHANGE_SUCCESS_MESSAGES.PASSWORD_CHANGED)

        // Reset to first step after 3 seconds (duration of success toast message)
        setTimeout(async () => {
          try {
            handleInfo(PASSWORD_CHANGE_INFO_MESSAGES.SECURITY_LOGOUT)

            // Small 4 seconds delay to allow the info toast message to be seen
            await new Promise((resolve) => setTimeout(resolve, 4000))

            await handleLogout()
            router.push('/login')
          } catch (error) {
            console.error('Automatic logout failed:', error)
            resetPasswordChange()
          }
        }, 3000)
      } catch (error) {
        console.error('Password change failed:', error)
        handleError(error, PASSWORD_CHANGE_ERROR_MESSAGES.COMPLETE_FAILED)

        // Reset to first step if there was an error
        currentStep.value = 1
      } finally {
        passwordChanging.value = false
      }
    }

    // Add TOTP related state
    const setupMode = ref(false)
    const setupStep = ref(1)
    const totpSetup = ref<TOTPSetupResponse>({
      secret: '',
      qrCodeUrl: '',
      manualEntryKey: ''
    })
    const verificationCode = ref('')
    const verificationError = ref('')
    const disabling = ref(false)
    const verifying = ref(false)

    // Start TOTP setup
    const startSetup = async () => {
      setupMode.value = true
      setupStep.value = 1
      verificationCode.value = ''
      verificationError.value = ''

      try {
        loading.value = true
        const setupData = await TOTPService.setupTOTP()
        totpSetup.value = setupData
      } catch (error) {
        console.error('Failed to setup TOTP:', error)
        handleError(error, PROFILE_ERROR_MESSAGES.TOTP_SETUP_FAILED)
        cancelSetup()
      } finally {
        loading.value = false
      }
    }

    // Cancel setup
    const cancelSetup = () => {
      setupMode.value = false
      setupStep.value = 1
      verificationCode.value = ''
      verificationError.value = ''
      totpSetup.value = {
        secret: '',
        qrCodeUrl: '',
        manualEntryKey: ''
      }
    }

    // Verify and enable TOTP
    const verifyAndEnableTotp = async () => {
      if (verificationCode.value.length !== 6) {
        verificationError.value = 'Please enter a 6-digit code'
        return
      }

      verificationError.value = ''
      verifying.value = true

      try {
        const success = await TOTPService.verifyTOTP(verificationCode.value)
        if (success) {
          user.value.totpEnabled = true
          setupMode.value = false
          handleSuccess(PROFILE_SUCCESS_MESSAGES.TOTP_SETUP_SUCCESS)

          // Dispatch event to notify MainLayout about TOTP status change
          window.dispatchEvent(new CustomEvent('totp-status-changed'))
        } else {
          verificationError.value = 'Invalid verification code. Please try again.'
        }
      } catch (error) {
        console.error('Failed to verify TOTP:', error)
        verificationError.value = 'Failed to verify code. Please try again.'
        handleError(error, PROFILE_ERROR_MESSAGES.TOTP_VERIFY_FAILED)
      } finally {
        verifying.value = false
      }
    }

    // Confirm disable TOTP
    const confirmDisable = () => {
      confirm.require({
        message:
          'Are you sure you want to disable two-factor authentication? This will reduce your account security.',
        header: 'Disable 2FA',
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: () => disableTotp()
      })
    }

    // Disable TOTP
    const disableTotp = async () => {
      disabling.value = true

      try {
        const success = await TOTPService.disableTOTP()
        if (success) {
          user.value.totpEnabled = false
          handleSuccess(PROFILE_SUCCESS_MESSAGES.TOTP_DISABLE_SUCCESS)

          // Dispatch event to notify MainLayout about TOTP status change
          window.dispatchEvent(new CustomEvent('totp-status-changed'))
        }
      } catch (error) {
        console.error('Failed to disable TOTP:', error)
        handleError(error, PROFILE_ERROR_MESSAGES.TOTP_DISABLE_FAILED)
      } finally {
        disabling.value = false
      }
    }

    // Copy to clipboard utility
    const copyToClipboard = (text: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          handleSuccess('Copied to clipboard')
        })
        .catch((err) => {
          console.error('Failed to copy:', err)
        })
    }

    // Reset verification error when code is changed
    watch(verificationCode, () => {
      verificationError.value = ''
    })

    onMounted(() => {
      fetchUserProfile()
    })

    const formatDate = (dateInput: string | Date) => {
      if (!dateInput) return 'N/A'
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    return {
      user,
      loading,
      formatDate,
      currentStep,
      passwordChanging,
      passwordForm,
      v$,
      resetPasswordChange,
      validateCurrentPassword,
      validateNewPassword,
      // Password validation helpers
      passwordMeetsLength,
      passwordHasUppercase,
      passwordHasLowercase,
      passwordHasDigit,
      passwordHasSpecial,
      // TOTP setup
      setupMode,
      setupStep,
      totpSetup,
      verificationCode,
      verificationError,
      disabling,
      verifying,
      startSetup,
      cancelSetup,
      verifyAndEnableTotp,
      confirmDisable,
      copyToClipboard
    }
  }
})
</script>

<style scoped>
.profile {
  padding: 2rem;
  max-width: 100%;
  margin: 0 auto;
}

.profile-header {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: var(--surface-50);
  border-radius: 6px 6px 0 0;
}

.profile-icon {
  font-size: 1.5rem;
  margin-right: 1rem;
  color: var(--primary-color);
}

.profile-content,
.security-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.loading-text {
  margin-top: 1rem;
  color: var(--text-color-secondary);
}

.profile-field {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  border-bottom: 1px solid var(--surface-200);
  padding-bottom: 0.5rem;
}

.field-label {
  font-weight: 600;
  width: 150px;
  color: var(--text-color-secondary);
}

.field-value {
  flex: 1;
}

.mb-4 {
  margin-bottom: 1.5rem;
}

:deep(.p-card) {
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

:deep(.p-card .p-card-content) {
  padding: 0;
}

:deep(.p-progress-spinner) {
  margin: 0 auto;
}

/* Password Form Styles */
.form-field {
  margin-bottom: 1.5rem;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

.form-field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-color-secondary);
}

.form-field label.required::after {
  content: '*';
  color: var(--red-500);
  margin-left: 0.25rem;
}

.form-field .p-password,
.form-field .p-inputtext {
  width: 100%;
}

/* Position the eye icon properly in password fields */
:deep(.p-password) {
  width: 100%;
  display: flex;
}

:deep(.p-password-input) {
  flex: 1;
  width: 100%;
}

:deep(.p-password i.pi-eye),
:deep(.p-password i.pi-eye-slash) {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}

/* Form actions layout */
.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2.5rem;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
  gap: 1rem; /* Add proper spacing between buttons */
}

/* Ensure back and next buttons have proper spacing */
.form-actions .p-button {
  min-width: 120px; /* Give buttons a minimum width for better appearance */
  margin-right: 0;
}

/* For step 1, we want the button only on the right */
.step-content:nth-child(1) .form-actions {
  justify-content: flex-end;
}

/* Style for main action buttons */
.p-button.p-button-success {
  background-color: #34b56e;
  border-color: #34b56e;
}

/* Style for text buttons */
.p-button.p-button-text.p-button-success {
  color: #34b56e;
  background-color: transparent;
  border: none;
}

/* Ensure back button has proper spacing */
.p-button.p-button-text.p-button-success {
  padding-left: 1rem;
  padding-right: 1rem;
}

/* Add space between buttons when both are present */
.form-actions .p-button + .p-button {
  margin-left: auto;
}

.password-requirements {
  padding: 1rem;
}

.password-requirements h5 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.password-requirements ul {
  list-style-type: none;
}

.password-requirements li {
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
}

.password-requirements .pi {
  margin-right: 0.5rem;
}

.password-requirements .pi-times {
  color: var(--red-500);
}

.password-requirements .pi-check {
  color: var(--green-500);
}

.requirement-met {
  color: var(--green-500);
}

/* Custom Stepper Styles */
.custom-stepper {
  width: 85%;
  margin-right: auto;
  margin-left: auto;
  display: flex;
  flex-direction: column;
  margin-bottom: 2rem;
}

.step-indicators {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3rem;
  position: relative;
  text-align: center;
}

.step-indicators::before {
  content: '';
  position: absolute;
  top: 22px;
  left: 60px;
  right: 60px;
  height: 1px;
  background-color: var(--surface-400);
  z-index: 1;
}

.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
  width: 33.33%;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--surface-200);
  color: var(--text-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 5px;
  font-weight: bold;
  font-size: 1.2rem;
  box-shadow: 0 0 0 4px var(--surface-900);
  transition: background-color 0.3s ease;
}

.step-label {
  font-size: 0.9rem;
  color: var(--surface-400);
  font-weight: 500;
  transition: color 0.3s ease;
}

.step-indicator.active .step-number {
  background-color: #34b56e;
  color: white;
}

.step-indicator.active .step-label {
  color: white;
}

.step-indicator:last-child.active .step-label {
  color: #34b56e;
}

.step-indicator.completed .step-number {
  background-color: #34b56e;
  color: white;
}

.step-indicator.completed .step-label {
  color: #34b56e;
}

.step-content {
  margin-right: auto;
  margin-left: auto;
  width: 100%;
  min-height: 200px;
  padding: 1rem 0;
  animation: fadeIn 0.3s ease;
  display: flex;
  flex-direction: column;
}

/* Success Message */
.password-change-success {
  text-align: center;
  padding: 2rem;
  color: #34b56e;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.password-change-success i {
  font-size: 4rem;
  margin-bottom: 1.5rem;
}

.password-change-success h4 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: var(--text-color-primary);
}

.password-change-success p {
  color: var(--text-color-secondary);
  margin-bottom: 2rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

h3 {
  margin: 0;
}

h4 {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

/* Error messages */
:deep(.p-error) {
  margin-top: 0.25rem;
  color: var(--red-500) !important;
  font-size: 0.875rem;
  display: block;
}

:deep(.p-invalid) {
  border-color: var(--red-500) !important;
}

:deep(.p-password.p-invalid:not(.p-disabled) > .p-password-input) {
  border-color: var(--red-500) !important;
}

/* Enhanced error message styling to ensure visibility */
small.p-error {
  color: #ff5757 !important; /* Bright red that will be visible on dark backgrounds */
  font-weight: 500;
  opacity: 1;
}

/* Force text color in form validation errors */
.form-field small.p-error {
  color: #ff5757 !important;
}

/* Additional fixes for dark mode compatibility */
:deep(.p-password-input.p-invalid) {
  border-color: #ff5757 !important;
}

/* Ensure validation message is visible regardless of theme */
.form-field small {
  opacity: 1;
  visibility: visible;
}

/* Improve button spacing */
.p-button.p-button-success {
  background-color: #34b56e;
  border-color: #34b56e;
}

.p-button.p-button-text.p-button-success {
  color: #34b56e;
}

/* Target back button specifically */
.p-button.p-button-text.p-button-success {
  padding-left: 0;
}

/* TOTP Card Styles */
.totp-card {
  margin-top: 2rem;
}

.totp-content {
  padding: 1.5rem;
}

.totp-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  font-size: 1.2rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  background-color: rgba(255, 87, 87, 0.1);
  color: #ff5757;
}

.status-indicator.enabled {
  background-color: rgba(52, 181, 110, 0.1);
  color: #34b56e;
}

.status-indicator i {
  font-size: 1.5rem;
  margin-right: 0.75rem;
}

.security-alert {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background-color: rgba(255, 165, 0, 0.1);
  border-left: 4px solid #ffa500;
  padding: 1rem;
  border-radius: 4px;
  max-width: 600px;
  margin: 0 auto;
}

.security-alert i {
  color: #ffa500;
  font-size: 1.5rem;
}

.alert-text strong {
  display: block;
  margin-bottom: 0.5rem;
}

.alert-text p {
  margin: 0;
  color: var(--text-color-secondary);
}

.totp-actions {
  margin-top: 1rem;
}

/* Setup Styles */
.totp-setup {
  max-width: 600px;
  margin: 0 auto;
}

.setup-step {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.setup-step h4 {
  font-size: 1.2rem;
  margin: 0;
  text-align: center;
}

.qr-container,
.verification-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
}

.qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
}

.qr-code {
  max-width: 200px;
  max-height: 200px;
  padding: 1rem;
  background-color: white;
  border-radius: 8px;
}

.manual-key {
  text-align: center;
  margin-top: 1rem;
}

.key-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-family: monospace;
  font-size: 1.1rem;
  margin-top: 0.5rem;
}

.instructions {
  margin-top: 1.5rem;
  text-align: left;
}

.instructions p {
  margin: 0.5rem 0;
  color: var(--text-color-secondary);
}

.code-input {
  width: 100%;
  max-width: 250px;
  margin: 1rem 0;
}

.code-input label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.setup-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 1.5rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .totp-content {
    padding: 1rem;
  }

  .security-alert {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .setup-actions {
    flex-direction: column;
    gap: 1rem;
  }

  .setup-actions .p-button {
    width: 100%;
  }
}
</style>
