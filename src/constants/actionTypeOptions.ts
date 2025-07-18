export const actionTypeOptions = [
  { label: 'All', value: 'ALL' },

  // Authentication actions
  { label: 'User Login', value: 'USER_LOGIN' },
  { label: 'User Logout', value: 'USER_LOGOUT' },
  { label: 'User Registration', value: 'USER_REGISTRATION' },
  { label: 'Password Reset Request', value: 'PASSWORD_RESET_REQUEST' },
  { label: 'Password Reset Complete', value: 'PASSWORD_RESET_COMPLETE' },
  { label: 'Password Change', value: 'PASSWORD_CHANGE' },
  { label: 'MFA Setup', value: 'MFA_SETUP' },
  { label: 'MFA Verification', value: 'MFA_VERIFICATION' },
  { label: 'Login Failed', value: 'LOGIN_FAILED' },
  { label: 'Account Locked', value: 'ACCOUNT_LOCKED' },
  { label: 'Account Unlocked', value: 'ACCOUNT_UNLOCKED' },

  // Vault actions
  { label: 'Vault Create', value: 'VAULT_CREATE' },
  { label: 'Vault View', value: 'VAULT_VIEW' },
  { label: 'Vault Update', value: 'VAULT_UPDATE' },
  { label: 'Vault Delete', value: 'VAULT_DELETE' },
  { label: 'Vault Share', value: 'VAULT_SHARE' },
  { label: 'Vault Unshare', value: 'VAULT_UNSHARE' },

  // Credential actions
  { label: 'Credential Create', value: 'CREDENTIAL_CREATE' },
  { label: 'Credential View', value: 'CREDENTIAL_VIEW' },
  { label: 'Credential Update', value: 'CREDENTIAL_UPDATE' },
  { label: 'Credential Delete', value: 'CREDENTIAL_DELETE' },
  { label: 'Credential Password View', value: 'CREDENTIAL_PASSWORD_VIEW' },
  { label: 'Credential Export', value: 'CREDENTIAL_EXPORT' },
  { label: 'Credential Import', value: 'CREDENTIAL_IMPORT' },

  // Domain actions
  { label: 'Domain Create', value: 'DOMAIN_CREATE' },
  { label: 'Domain View', value: 'DOMAIN_VIEW' },
  { label: 'Domain Update', value: 'DOMAIN_UPDATE' },
  { label: 'Domain Delete', value: 'DOMAIN_DELETE' },

  // Admin actions
  { label: 'Admin User Manage', value: 'ADMIN_USER_MANAGE' },
  { label: 'Admin Audit Log Cleanup', value: 'ADMIN_AUDIT_LOG_CLEANUP' },
  { label: 'Admin System Backup', value: 'ADMIN_SYSTEM_BACKUP' },
  { label: 'Admin System Restore', value: 'ADMIN_SYSTEM_RESTORE' },
  { label: 'Admin System Settings Update', value: 'ADMIN_SYSTEM_SETTINGS_UPDATE' },

  // Security events
  { label: 'Encryption Key Rotation', value: 'ENCRYPTION_KEY_ROTATION' },
  { label: 'Suspicious Activity Detected', value: 'SUSPICIOUS_ACTIVITY_DETECTED' },
  { label: 'IP Address Blocked', value: 'IP_ADDRESS_BLOCKED' },
  { label: 'API Rate Limit Exceeded', value: 'API_RATE_LIMIT_EXCEEDED' },

  // Data management
  { label: 'Data Export', value: 'DATA_EXPORT' },
  { label: 'Data Import', value: 'DATA_IMPORT' },
  { label: 'Data Purge', value: 'DATA_PURGE' }
]
