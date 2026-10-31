export type MapLabelCandidate = {
  id: string
  x: number
  y: number
  width: number
  height: number
  priority: number
}

/** Keep protected labels, then prefer important labels without covering nearby targets. */
export function selectMapLabels(candidates: MapLabelCandidate[], gap = 4) {
  const accepted: MapLabelCandidate[] = []
  for (const candidate of [...candidates].sort((left, right) => right.priority - left.priority)) {
    const overlaps = accepted.some((other) =>
      Math.abs(candidate.x - other.x) < (candidate.width + other.width) / 2 + gap
      && Math.abs(candidate.y - other.y) < (candidate.height + other.height) / 2 + gap,
    )
    if (candidate.priority >= 1000 || !overlaps) accepted.push(candidate)
  }
  return new Set(accepted.map((candidate) => candidate.id))
}
