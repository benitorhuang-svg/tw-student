import L from 'leaflet'
import { formatStudents } from '../../lib/analytics'

export const LIGHT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
export const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

export function buildHoverPreviewHtml(title: string, students?: number) {
  const stats = (students != null && students > 0) ? ` <span class="atlas-map-hover-card__stats">${students.toLocaleString('zh-TW')}人</span>` : ''
  return `<div class="atlas-map-hover-card"><span class="atlas-map-hover-card__name">${title}</span>${stats}</div>`
}

export function renderHoverPreview(title: string, students?: number) {
  const stats = (students != null && students > 0) ? ` ${formatStudents(students)}人` : ''
  return (
    <div className="atlas-map-hover-card">
      <span className="atlas-map-hover-card__name">{title}</span>
      <span className="atlas-map-hover-card__stats">{stats}</span>
    </div>
  )
}

export function choroplethColor(students: number) {
  if (students >= 150000) return '#83b8aa'
  if (students >= 100000) return '#9fcec0'
  if (students >= 50000) return '#b9ddd1'
  if (students >= 10000) return '#d2ebe1'
  return '#e7f5ef'
}

export function choroplethOpacity(students: number) {
  if (students >= 150000) return 0.28
  if (students >= 100000) return 0.22
  if (students >= 50000) return 0.17
  if (students >= 10000) return 0.13
  return 0.09
}

/** 年增減色域：成長藍、衰退紅，依百分比深淺 */
export function growthChoroplethColor(deltaRatio: number) {
  const pct = Math.abs(deltaRatio * 100)
  if (deltaRatio >= 0) {
    if (pct >= 10) return '#1e40af'
    if (pct >= 5) return '#2563eb'
    if (pct >= 2) return '#60a5fa'
    return '#bfdbfe'
  }
  if (pct >= 10) return '#991b1b'
  if (pct >= 5) return '#dc2626'
  if (pct >= 2) return '#f87171'
  return '#fecaca'
}

export function growthChoroplethOpacity(deltaRatio: number) {
  const pct = Math.abs(deltaRatio * 100)
  if (pct >= 10) return 0.76
  if (pct >= 5) return 0.58
  if (pct >= 2) return 0.42
  return 0.26
}

export function renderScopeMarkerIcon(label: string, value: number, color: string, size: number, variant: 'region' | 'county' | 'township', compact = false) {
  const nameOnly = variant === 'township'
  const iconWidth = variant === 'township'
    ? Math.min(compact ? 108 : 164, (compact ? 28 : 42) + label.length * (compact ? 13 : 16))
    : size
  const displayLabel = nameOnly
    ? label
    : compact
      ? label.slice(0, 1)
      : label.length > 4
        ? `${label.slice(0, 4)}…`
        : label
  const hideValue = true

  return L.divIcon({
    className: 'atlas-region-dot-wrapper',
    iconSize: [iconWidth, size],
    iconAnchor: [iconWidth / 2, size / 2],
    html: `
      <div class="atlas-scope-dot atlas-scope-dot--${variant}${hideValue ? ' atlas-scope-dot--compact' : ''}" style="--region-dot-size:${size}px; --scope-dot-width:${iconWidth}px; --scope-dot-color:${color};">
        <span class="atlas-region-dot__label">${displayLabel}</span>
        ${hideValue ? '' : `<strong class="atlas-region-dot__value">${value.toLocaleString('zh-TW')}</strong>`}
      </div>
    `,
  })
}

export function renderFocusLabelIcon(label: string, variant: 'focus' | 'township' = 'focus') {
  return L.divIcon({
    className: variant === 'township' ? 'atlas-map-township-label-wrapper' : 'atlas-map-focus-label-wrapper',
    iconSize: [160, 38],
    iconAnchor: [80, 19],
    html: `<div class="${variant === 'township' ? 'atlas-map-township-label' : 'atlas-map-focus-label'}">${label}</div>`,
  })
}
