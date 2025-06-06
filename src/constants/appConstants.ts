export const TOAST_LIFE_SUCCESS = 3000
export const TOAST_LIFE_ERROR = 5000
export const TOAST_LIFE_WARNING = 4000
export const TOAST_LIFE_INFO = 4000

export const USER_STORAGE_KEY = 'lockbox_user'

export const AUTH = {
  TOKEN_COOKIE_NAME: 'auth_token',
  TOKEN_EXPIRATION: '5min',
  COOKIE_SAME_SITE: 'Strict',
  USER_STORAGE_KEY: 'lockbox_user'
}

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH'
}

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
}

export const ERROR_TYPES = {
  AUTH_ERROR: 'Authentication Error',
  API_ERROR: 'API Error',
  NOT_FOUND_ERROR: 'Not Found Error',
  VALIDATION_ERROR: 'Validation Error',
  ENCRYPTION_ERROR: 'Encryption Error'
}

export const GENERIC_ERROR_MESSAGES = {
  AUTH_TOKEN_MISSING: 'Authentication token is missing',
  INVALID_SERVER_RESPONSE: 'Invalid response from server',
  DECRYPTION_FAILED: 'Failed to decrypt data'
}

export const DOMAIN_ERROR_MESSAGES = {
  FETCH_DOMAINS_FAILED: 'Failed to load domains',
  FETCH_DOMAIN_FAILED: 'Failed to fetch domain',
  CREATE_DOMAIN_FAILED: 'Failed to create domain',
  UPDATE_DOMAIN_FAILED: 'Failed to update domain',
  DELETE_DOMAIN_FAILED: 'Failed to delete domain',
  GET_CREDENTIAL_COUNT_FAILED: 'Failed to get credential count for domain',
  DOMAIN_NOT_FOUND: 'Domain with ID {id} not found',
  FETCH_ALL_DOMAINS_FAILED: 'Failed to fetch all domains',
  SEARCH_DOMAINS_FAILED: 'Failed to search domains'
}

export const DOMAIN_SUCCESS_MESSAGES = {
  CREATE_DOMAIN_SUCCESS: 'Domain created successfully',
  UPDATE_DOMAIN_SUCCESS: 'Domain updated successfully',
  DELETE_DOMAIN_SUCCESS: 'Domain deleted successfully',
  COPY_SUCCESS: 'Copied to clipboard'
}

export const CREDENTIAL_ERROR_MESSAGES = {
  FETCH_CREDENTIALS_FAILED: 'Failed to load credentials',
  FETCH_CREDENTIAL_FAILED: 'Failed to fetch credential',
  CREATE_CREDENTIAL_FAILED: 'Failed to create credential',
  UPDATE_CREDENTIAL_FAILED: 'Failed to update credential',
  DELETE_CREDENTIAL_FAILED: 'Failed to delete credential',
  TOGGLE_FAVORITE_FAILED: 'Failed to update favorite status',
  UPDATE_LAST_USED_FAILED: 'Failed to update credential usage data',
  CREDENTIAL_NOT_FOUND: 'Credential with ID {id} not found',
  INVALID_CATEGORY: 'Invalid category. Allowed categories are: {categories}'
}

export const CREDENTIAL_SUCCESS_MESSAGES = {
  CREATE_CREDENTIAL_SUCCESS: 'Credential created successfully',
  UPDATE_CREDENTIAL_SUCCESS: 'Credential updated successfully',
  DELETE_CREDENTIAL_SUCCESS: 'Credential deleted successfully',
  TOGGLE_FAVORITE_SUCCESS: 'Favorite status updated',
  COPY_SUCCESS: 'Copied to clipboard'
}

export const AUTH_ERROR_MESSAGES = {
  LOGIN_FAILED: 'Login failed. Please check your credentials and try again.',
  REGISTER_FAILED: 'Registration failed. Please try again.',
  PASSWORD_MISMATCH: 'Passwords do not match.',
  WEAK_PASSWORD: 'Password does not meet security requirements.',
  REQUIRED_FIELDS: 'Please fill in all required fields.',
  AUTH_TOKEN_MISSING: 'Authentication token is missing',
  REGISTRATION_FAILED: 'Failed to register user',
  SRP_PARAMS_FAILED: 'Failed to fetch SRP parameters',
  AUTHENTICATION_FAILED: 'Authentication failed',
  LOGOUT_FAILED: 'Failed to log out',
  MISSING_CREDENTIALS: 'Username, email, or password is missing',
  INVALID_SESSION_TOKEN: 'Invalid or missing session token',
  INVALID_SERVER_VALUE: 'Authentication failed: Invalid server value B',
  PROOF_VERIFICATION_FAILED: 'Proof verification failed. Authorization aborted!',
  NO_ACTIVE_SESSION: 'No active session to logout from'
}

export const AUTH_SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  REGISTER_SUCCESS: 'Registration successful',
  LOGOUT_SUCCESS: 'Logout successful',
  PASSWORD_RESET_SUCCESS: 'Password reset successful'
}

export const DASHBOARD_ERROR_MESSAGES = {
  FETCH_OVERVIEW_FAILED: 'Failed to fetch overview statistics',
  FETCH_LOGIN_HISTORY_FAILED: 'Failed to fetch login history',
  DECRYPT_OVERVIEW_FAILED: 'Failed to decrypt overview statistics',
  DECRYPT_LOGIN_HISTORY_FAILED: 'Failed to decrypt login history'
}

export const PROFILE_ERROR_MESSAGES = {
  FETCH_PROFILE_FAILED: 'Failed to fetch user profile',
  UPDATE_PROFILE_FAILED: 'Failed to update user profile',
  DECRYPT_PROFILE_FAILED: 'Failed to decrypt user profile data',
  PASSWORD_CHANGE_FAILED: 'Failed to change password',
  USERNAME_MISSING: 'Username not found in session storage',
  INVALID_PASSWORD: 'Invalid password format'
}

export const PASSWORD_CHANGE_ERROR_MESSAGES = {
  MISSING_CREDENTIALS: 'Please provide your username and current password',
  INIT_FAILED: 'Failed to initiate password change. Please try again.',
  COMPLETE_FAILED: 'Failed to complete password change. Please try again.',
  INVALID_STATE: 'Invalid password change state. Please start over.',
  PROOF_VERIFICATION_FAILED: 'Server verification failed. Please try again.',
  CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect'
}

export const PASSWORD_CHANGE_SUCCESS_MESSAGES = {
  PASSWORD_CHANGED: 'Your password has been changed successfully'
}

export const PASSWORD_CHANGE_INFO_MESSAGES = {
  SECURITY_LOGOUT: "You'll be logged out for security reasons."
}

export const AUDIT_ERROR_MESSAGES = {
  FETCH_LOGS_FAILED: 'Failed to fetch audit logs',
  INVALID_DATE_RANGE: 'Start date must be before end date',
  FETCH_LOG_DETAILS_FAILED: 'Failed to fetch audit log details'
}

export const VAULT_ERROR_MESSAGES = {
  FETCH_VAULTS_FAILED: 'Failed to load vaults',
  FETCH_VAULT_FAILED: 'Failed to fetch vault',
  CREATE_VAULT_FAILED: 'Failed to create vault',
  UPDATE_VAULT_FAILED: 'Failed to update vault',
  DELETE_VAULT_FAILED: 'Failed to delete vault'
}

export const VAULT_SUCCESS_MESSAGES = {
  CREATE_VAULT_SUCCESS: 'Vault created successfully',
  UPDATE_VAULT_SUCCESS: 'Vault updated successfully',
  DELETE_VAULT_SUCCESS: 'Vault deleted successfully'
}

export const USER_FEEDBACK_MESSAGES = {
  CONFIRMATION_REQUIRED: 'Please confirm this action',
  CANNOT_DELETE_DOMAIN_WITH_CREDENTIALS: 'Cannot delete domain with associated credentials',
  PASSWORD_HIDDEN: 'Password hidden',
  PASSWORD_VISIBLE: 'Password visible'
}

export const CREDENTIAL_CATEGORIES = [
  'Social Media',
  'Banking',
  'Email',
  'Shopping',
  'Work',
  'Entertainment',
  'Development',
  'Personal',
  'Education',
  'Finance',
  'Travel',
  'Health',
  'Gaming',
  'Communication',
  'Productivity',
  'Cloud Storage',
  'Security',
  'Other'
]

export const DEFAULTS = {
  PAGE_SIZE: 10,
  LARGE_PAGE_SIZE: 1000,
  DEFAULT_SORT_DIRECTION: 'asc',
  DEFAULT_ICON: 'pi pi-user',
  CHUNK_SIZE: 50,
  INITIAL_CHUNKS: 1,
  MAX_CACHED_ITEMS: 500
}

export const DATE_FORMATS = {
  DISPLAY_DATE: 'MMMM D, YYYY',
  DISPLAY_DATETIME: 'MMMM D, YYYY h:mm A',
  API_DATE: 'YYYY-MM-DD',
  ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
}

export const PASSWORD_SETTINGS = {
  DEFAULT_LENGTH: 24,
  DEFAULT_CHARSET:
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?'
}

export const NOTIFICATION_ERROR_MESSAGES = {
  FETCH_FAILED: 'Failed to retrieve notifications',
  FETCH_NOTIFICATION_FAILED: 'Failed to retrieve notification',
  FETCH_UNREAD_COUNT_FAILED: 'Failed to retrieve unread notification count',
  UPDATE_STATUS_FAILED: 'Failed to update notification status',
  MARK_ALL_READ_FAILED: 'Failed to mark all notifications as read',
  DELETE_FAILED: 'Failed to delete notification',
  NOTIFICATION_NOT_FOUND: 'Notification not found'
}

export const NOTIFICATION_SUCCESS_MESSAGES = {
  DELETE_SUCCESS: 'Notification deleted successfully',
  MARK_READ_SUCCESS: 'Notification marked as read',
  MARK_UNREAD_SUCCESS: 'Notification marked as unread',
  MARK_ALL_READ_SUCCESS: 'All notifications marked as read'
}
