import type { EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../data/educationData'

export const COMPARISON_FAVORITES_STORAGE_KEY = 'tw-atlas-comparison-favorites'
export const COMPARISON_RECENTS_STORAGE_KEY = 'tw-atlas-comparison-recents'
export const THEME_STORAGE_KEY = 'tw-atlas-theme'

export type AtlasTheme = 'light' | 'dark'

export const EDUCATION_LEVEL_OPTIONS: ReadonlyArray<{ value: EducationLevelFilter; label: string }> = [
  { value: '全部', label: '學制' },
  { value: '國小', label: '國小' },
  { value: '國中', label: '國中' },
  { value: '高中職', label: '高中職' },
  { value: '大專院校', label: '大專院校' },
]

export const MANAGEMENT_TYPE_OPTIONS: ReadonlyArray<{ value: ManagementTypeFilter; label: string }> = [
  { value: '全部', label: '公私立' },
  { value: '公立', label: '公立' },
  { value: '私立', label: '私立' },
]

export const REGION_OPTIONS: ReadonlyArray<{ value: RegionGroupFilter; label: string }> = [
  { value: '全部', label: '地區類別' },
  { value: '北部', label: '北部' },
  { value: '中部', label: '中部' },
  { value: '南部', label: '南部' },
  { value: '東部', label: '東部' },
  { value: '離島', label: '離島' },
]

export function readInitialTheme(): AtlasTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
