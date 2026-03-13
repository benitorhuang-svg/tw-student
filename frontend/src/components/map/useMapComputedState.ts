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
  _currentMapCenter?: [number, number] | null,
) {
  // `_currentMapCenter` is intentionally unused today but kept in the signature
  // so calling code can opt into center-aware logic later without changing the
  // hook signature.
  void _currentMapCenter

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

  // =========================================================================
  // Google Maps–style zoom-driven visibility rules (spec story 17)
  //
  // Key principles:
  //   1. Upper layers never vanish — they just step back (like Google Maps)
  //   2. No special-case filtering for any county (嘉市 etc.)
  //   3. This is the SINGLE source of truth — no override branches below
  //
  // | Zoom   | Counties | Townships | Schools |
  // |--------|----------|-----------|---------|
  // | 7–8    | ✔        |           |         |
  // | 9–10   | ✔        | ✔ (10+)   |         |
  // | 11–12  | ✔        | ✔         |         |
  // | 13+    | ✔        | ✔         | ✔       |
  // =========================================================================
  const showCountyMarkers = true // always visible — upper layer never hides
  const showTownshipMarkers = zoom >= 10
  // schools become visible one zoom level sooner – begin at 12 instead
  let showSchoolMarkers = zoom >= 12 && schoolPoints.length > 0

  // Always allow an explicit school selection to surface its marker
  if (selectedSchoolId) showSchoolMarkers = true

  return {
    activeCounty,
    countyLookup,
    townshipLookup,
    countyCenterLookup,
    townshipCenterLookup,
    countyAtCenterId: null as string | null,
    showCountyMarkers,
    showTownshipMarkers,
    showSchoolMarkers,
  }
}
