export function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return ''
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

export function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  const n = xs.length
  if (n < 2) return null

  const sumX = xs.reduce((total, value) => total + value, 0)
  const sumY = ys.reduce((total, value) => total + value, 0)
  const sumXY = xs.reduce((total, value, index) => total + value * ys[index], 0)
  const sumX2 = xs.reduce((total, value) => total + value * value, 0)
  const denominator = n * sumX2 - sumX * sumX

  if (denominator === 0) return null

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}
