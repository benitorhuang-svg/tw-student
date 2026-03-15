import { useMemo } from 'react'
import type { CountyBoundaryCollection, TownshipBoundaryCollection } from '../../data/educationData'
import type { CountySummary, RankingSummary } from '../../lib/analytics'
import type { SchoolMapPoint } from './types'
import { computeLayerVisibility } from './mapVisibilityAtoms'

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
  const visibility = computeLayerVisibility(zoom, schoolPoints.length > 0, !!selectedSchoolId)

  return {
    activeCounty,
    countyLookup,
    townshipLookup,
    countyCenterLookup,
    townshipCenterLookup,
    countyAtCenterId: null as string | null,
    ...visibility,
  }
}
