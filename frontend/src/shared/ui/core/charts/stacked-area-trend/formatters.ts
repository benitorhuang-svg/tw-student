export function formatStackedTrendValue(value: number) {
  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(1)}萬`
  }

  return value.toLocaleString()
}

export function formatStackedTrendDelta(delta: number) {
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : ''
  if (delta === 0) return '0'

  const absDelta = Math.abs(delta)
  if (absDelta < 10000) {
    return `${sign}${absDelta.toLocaleString()}`
  }

  const value = absDelta / 10000
  const formatted = value < 0.1 ? value.toFixed(2) : value.toFixed(1)
  return `${sign}${formatted}萬`
}
