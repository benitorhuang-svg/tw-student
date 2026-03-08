const SCHOOL_LEVEL_THEME = {
  國小: { label: '國小', color: '#22c55e' },
  國中: { label: '國中', color: '#38bdf8' },
  高中職: { label: '高中職', color: '#f59e0b' },
  大專院校: { label: '大專院校', color: '#ef4444' },
} as const

export const SCHOOL_LEVEL_LEGEND = Object.values(SCHOOL_LEVEL_THEME)

export function getSchoolLevelColor(level: string | null | undefined) {
  if (!level) {
    return '#94a3b8'
  }

  return SCHOOL_LEVEL_THEME[level as keyof typeof SCHOOL_LEVEL_THEME]?.color ?? '#94a3b8'
}

export function getSchoolLevelLabel(level: string | null | undefined) {
  if (!level) {
    return '混合學制'
  }

  return SCHOOL_LEVEL_THEME[level as keyof typeof SCHOOL_LEVEL_THEME]?.label ?? '混合學制'
}