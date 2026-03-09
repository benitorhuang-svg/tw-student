import { useMemo } from 'react'

import type { CountyBoundaryCollection, TownshipBoundaryCollection } from '../../data/educationData'
import type { CountySummary, RankingSummary } from '../../lib/analytics'
import type { SchoolMapPoint } from './types'

export function useMapComputedState(
  counties: CountySummary[],
  activeCountyId: string | null,
  activeTownshipId: string | null,
  selectedSchoolId: string | null,
  countyBoundaries: CountyBoundaryCollection,
  townshipBoundaries: TownshipBoundaryCollection | null,
  townshipRows: RankingSummary[],
  schoolPoints: SchoolMapPoint[],
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

  const showCountyMarkers = !activeCounty
  const showTownshipMarkers = Boolean(activeCounty) && !activeTownshipId && !selectedSchoolId
  const showSchoolMarkers = Boolean(activeCounty) && (Boolean(activeTownshipId) || Boolean(selectedSchoolId)) && schoolPoints.length > 0

  return {
    activeCounty,
    countyLookup,
    townshipLookup,
    countyCenterLookup,
    townshipCenterLookup,
    showCountyMarkers,
    showTownshipMarkers,
    showSchoolMarkers,
  }
}
