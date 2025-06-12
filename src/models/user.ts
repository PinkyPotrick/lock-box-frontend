export interface User {
  username: string
  email: string
  createdAt: string | Date
  updatedAt?: string | Date
  totpEnabled?: boolean
}

export interface TOTPSetupResponse {
  secret: string
  qrCodeUrl: string
  manualEntryKey: string
}

export interface TOTPVerifyRequest {
  code: string
}

export interface TOTPLoginVerifyRequest {
  code: string
  sessionId: string
}
