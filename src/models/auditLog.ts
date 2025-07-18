export interface AuditLog {
  id: string
  userId: string
  timestamp: Date | number[] | null
  actionType: string
  operationType: 'READ' | 'WRITE' | 'UPDATE' | 'DELETE'
  logLevel: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  actionStatus: string
  resourceId: string
  resourceName: string
  additionalInfo: string
  ipAddress: string
  clientInfo: string
  failureReason: string
}
