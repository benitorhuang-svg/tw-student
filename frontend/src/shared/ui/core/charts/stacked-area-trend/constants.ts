export const RECENT_YEAR_COUNT = 7
export const SINGLE_SERIES_BASE_HEIGHT = 260
export const MULTI_SERIES_BASE_HEIGHT = 420
export const SINGLE_SERIES_MAX_HEIGHT = 320
export const MULTI_SERIES_MAX_HEIGHT = 520
export const SEGMENT_DELTA_MIN_HEIGHT = 10

export const SERIES_COLORS = [
  { start: 'var(--chart-area-0)', end: 'var(--chart-area-0)', glow: 'transparent' },
  { start: 'var(--chart-area-1)', end: 'var(--chart-area-1)', glow: 'transparent' },
  { start: 'var(--chart-area-2)', end: 'var(--chart-area-2)', glow: 'transparent' },
  { start: 'var(--chart-area-3)', end: 'var(--chart-area-3)', glow: 'transparent' },
  { start: 'var(--chart-area-4)', end: 'var(--chart-area-4)', glow: 'transparent' },
]

export type SeriesColor = (typeof SERIES_COLORS)[number]
