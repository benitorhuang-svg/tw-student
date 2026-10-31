/** One palette for school markers, chart series and education legends. */
export const EDUCATION_THEME = {
  國小: { label: '國小', color: '#22c55e' },
  國中: { label: '國中', color: '#38bdf8' },
  高中職: { label: '高中職', color: '#f59e0b' },
  大專院校: { label: '大專院校', color: '#ef4444' },
} as const

export const EDUCATION_LEGEND = Object.values(EDUCATION_THEME)

export function getEducationTheme(level?: string | null) {
  const key = level === '大專' ? '大專院校' : level
  return key && key in EDUCATION_THEME ? EDUCATION_THEME[key as keyof typeof EDUCATION_THEME] : null
}

export function getEducationColor(level?: string | null) {
  return getEducationTheme(level)?.color ?? '#94a3b8'
}

export function getEducationLabel(level?: string | null) {
  return getEducationTheme(level)?.label ?? '混合學制'
}
