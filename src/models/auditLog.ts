export interface AuditLog {
  id: string
  operation: 'READ' | 'WRITE' | 'UPDATE' | 'DELETE'
  description: string
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  date: string
}
