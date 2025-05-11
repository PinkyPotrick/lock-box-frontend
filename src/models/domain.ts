export interface Domain {
  id: string
  name: string
  url: string
  description?: string
  createdAt: Date
  updatedAt: Date
  credentialCount?: number
}
