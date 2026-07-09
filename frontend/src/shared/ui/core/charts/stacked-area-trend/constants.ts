export const RECENT_YEAR_COUNT = 7
export const SINGLE_SERIES_BASE_HEIGHT = 260
export const MULTI_SERIES_BASE_HEIGHT = 420
export const SINGLE_SERIES_MAX_HEIGHT = 320
export const MULTI_SERIES_MAX_HEIGHT = 520
export const SEGMENT_DELTA_MIN_HEIGHT = 10

export const SERIES_COLORS = [
  { start: '#38bdf8', end: '#0ea5e9', glow: 'rgba(56, 189, 248, 0.4)' },
  { start: '#34d399', end: '#10b981', glow: 'rgba(52, 211, 153, 0.4)' },
  { start: '#fbbf24', end: '#f59e0b', glow: 'rgba(251, 191, 36, 0.4)' },
  { start: '#f87171', end: '#ef4444', glow: 'rgba(248, 113, 113, 0.4)' },
  { start: '#a855f7', end: '#8b5cf6', glow: 'rgba(168, 85, 247, 0.4)' },
]

export type SeriesColor = (typeof SERIES_COLORS)[number]
