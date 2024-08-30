export interface LevelOption {
  label: string
  value: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | null
}

export const levelOptions: LevelOption[] = [
  { label: 'All', value: null },
  { label: 'Debug', value: 'DEBUG' },
  { label: 'Info', value: 'INFO' },
  { label: 'Warning', value: 'WARNING' },
  { label: 'Error', value: 'ERROR' },
  { label: 'Critical', value: 'CRITICAL' }
]
