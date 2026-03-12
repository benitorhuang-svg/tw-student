import { useMemo } from 'react'

import type { CountyBoundaryCollection, TownshipBoundaryCollection } from '../../data/educationData'
import type { CountySummary, RankingSummary } from '../../lib/analytics'
import type { SchoolMapPoint } from './types'

export function useMapComputedState(
  counties: CountySummary[],
  activeCountyId: string | null,
  _activeTownshipId: string | null,
  selectedSchoolId: string | null,
  countyBoundaries: CountyBoundaryCollection,
  townshipBoundaries: TownshipBoundaryCollection | null,
  townshipRows: RankingSummary[],
  schoolPoints: SchoolMapPoint[],
  currentMapZoom?: number | null,
  currentMapCenter?: [number, number] | null,
) {
  const activeCounty = counties.find((c) => c.id === activeCountyId) ?? null
  const countyLookup = new Map(counties.map((c) => [c.id, c]))
  const townshipLookup = new Map(townshipRows.map((t) => [t.id, t]))

  const countyCenterLookup = useMemo(
    () =>
      new Map(
        countyBoundaries.features.map((feature) => [
          feature.properties.countyId,
          [feature.properties.centerLatitude, feature.properties.centerLongitude] as [number, number],
        ]),
      ),
    [countyBoundaries],
  )

  const townshipCenterLookup = useMemo(() => {
    if (!townshipBoundaries) return new Map<string, [number, number]>()
    return new Map(
      townshipBoundaries.features.map((feature) => [
        feature.properties.townId,
        [feature.properties.centerLatitude, feature.properties.centerLongitude] as [number, number],
      ]),
    )
  }, [townshipBoundaries])

  const zoom = currentMapZoom ?? 7

  // Determine nearest county to the current map center (if provided)
  let countyAtCenterId: string | null = null
  if (currentMapCenter) {
    const [centerLat, centerLon] = currentMapCenter
    let bestId: string | null = null
    let bestDist = Number.POSITIVE_INFINITY
    for (const [id, [lat, lon]] of countyCenterLookup.entries()) {
      const dLat = lat - centerLat
      const dLon = lon - centerLon
      const distSq = dLat * dLat + dLon * dLon
      if (distSq < bestDist) {
        bestDist = distSq
        bestId = id
      }
    }
    // If nearest county center is reasonably close (within ~1 degree), consider center inside/near that county
    if (bestId && bestDist < 1.0) countyAtCenterId = bestId
  }

  // Zoom-driven visibility rules (user requirements):
  // - zoom == 10: show county + township
  // - zoom == 11: show township only
  // - zoom >= 12: show township + school markers
  // Fallback to prior behavior when zoom is lower than 10.
    let showCountyMarkers = false
    let showTownshipMarkers = false
    let showSchoolMarkers = false

    if (zoom < 10) {
      showCountyMarkers = true
    } else if (zoom === 10) {
      showCountyMarkers = true
      showTownshipMarkers = true
    } else if (zoom === 11) {
      showTownshipMarkers = true
    } else if (zoom >= 12) {
      showTownshipMarkers = true
      showSchoolMarkers = schoolPoints.length > 0
    }

    // Always allow explicit selections to surface school markers
    if (selectedSchoolId) showSchoolMarkers = true
  // Also allow map center to enable township display when zoomed-in (useful for deep-linked lat/lon)
  const centerEnablesTownships = !!countyAtCenterId

  if (zoom === 10 || (zoom >= 10 && centerEnablesTownships && !activeCounty)) {
    showCountyMarkers = true
    showTownshipMarkers = true
    showSchoolMarkers = false
  } else if (zoom === 11 || (zoom >= 11 && centerEnablesTownships && !activeCounty)) {
    showCountyMarkers = false
    showTownshipMarkers = true
    showSchoolMarkers = false
  } else if (zoom >= 12) {
    // show township markers for context, and enable school markers
    showCountyMarkers = false
    showTownshipMarkers = true
    showSchoolMarkers = schoolPoints.length > 0
  }

  return {
    activeCounty,
    countyLookup,
    townshipLookup,
    countyCenterLookup,
    townshipCenterLookup,
    countyAtCenterId,
    showCountyMarkers,
    showTownshipMarkers,
    showSchoolMarkers,
  }
}
