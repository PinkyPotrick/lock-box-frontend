export enum NotificationType {
  SECURITY_ALERT = 'SECURITY_ALERT',
  ACCOUNT = 'ACCOUNT',
  CONTENT = 'CONTENT',
  SYSTEM = 'SYSTEM',
  PROMOTIONAL = 'PROMOTIONAL'
}

export enum ResourceType {
  USER = 'USER',
  VAULT = 'VAULT',
  CREDENTIAL = 'CREDENTIAL',
  DOMAIN = 'DOMAIN',
  SYSTEM = 'SYSTEM'
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum NotificationStatus {
  READ = 'READ',
  UNREAD = 'UNREAD'
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  resourceId: string
  resourceType: ResourceType
  priority: NotificationPriority
  status: NotificationStatus
  createdAt: Date | number[]
  readAt: Date | number[] | null
  actionLink: string
  metadata: string
  sentViaEmail: boolean
}
