import type { SchoolMapPoint } from '../types'

export function getClusterRadius(count: number, totalStudents: number, maxStudents: number, zoom: number) {
  const studentScale = Math.max(0.24, totalStudents / maxStudents)

  if (count <= 1) {
    return Math.max(6, Math.min(12, (zoom >= 11 ? 7 : zoom >= 10 ? 8 : 10) + studentScale * 2))
  }

  const baseSize = zoom >= 11 ? 8 : zoom >= 10 ? 12 : 16
  return Math.max(baseSize + studentScale * 2, Math.min(34, baseSize + Math.log2(count) * 2 + studentScale * 12))
}

export function getDominantEducationLevel(points: SchoolMapPoint[]) {
  if (points.length === 0) return null

  const levelCounts = new Map<string, number>()
  points.forEach((point) => {
    levelCounts.set(point.educationLevel, (levelCounts.get(point.educationLevel) ?? 0) + 1)
  })

  return [...levelCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
}
