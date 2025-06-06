export const API_PATHS = {
  AUTH: {
    PUBLIC_KEY: '/api/auth/public-key',
    REGISTER: '/api/auth/register',
    SRP_PARAMS: '/api/auth/srp-params',
    SRP_AUTHENTICATE: '/api/auth/srp-authenticate',
    LOGOUT: '/api/auth/logout'
  },
  USERS: {
    PROFILE: '/api/users/profile',
    PASSWORD_CHANGE_INIT: '/api/users/password-change/init',
    PASSWORD_CHANGE_COMPLETE: '/api/users/password-change/complete'
  },
  DASHBOARD: {
    OVERVIEW: '/api/dashboard/overview',
    LOGIN_HISTORY: '/api/dashboard/login-history'
  },
  VAULTS: {
    BASE: '/api/vaults'
  },
  DOMAINS: {
    BASE: '/api/domains'
  },
  AUDIT: {
    LOGS: '/api/audit-logs'
  },
  NOTIFICATIONS: {
    BASE: '/api/notifications',
    UNREAD_COUNT: '/api/notifications/unread-count',
    READ_STATUS: '/api/notifications/read-status',
    MARK_ALL_READ: '/api/notifications/mark-all-read'
  }
}
