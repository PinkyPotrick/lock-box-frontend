export interface OperationOption {
  label: string
  value: 'READ' | 'WRITE' | 'UPDATE' | 'DELETE' | null
}

export const operationOptions: OperationOption[] = [
  { label: 'All', value: null },
  { label: 'Read', value: 'READ' },
  { label: 'Write', value: 'WRITE' },
  { label: 'Update', value: 'UPDATE' },
  { label: 'Delete', value: 'DELETE' }
]
