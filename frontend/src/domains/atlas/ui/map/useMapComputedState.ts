import { useMemo } from 'react'
import type { CountyBoundaryCollection, TownshipBoundaryCollection } from '@/shared/api/data/educationData'
import type { CountySummary, RankingSummary } from '@/shared/lib/analytics'
import type { SchoolMapPoint } from './types'
import { computeLayerVisibility } from './mapVisibilityAtoms'
import { resolveCountyMapAnchor } from './countyMapAnchors'

export function useMapComputedState(
  counties: CountySummary[],
  activeCountyId: string | null,
  _activeTownshipId: string | null,
  countyBoundaries: CountyBoundaryCollection,
  townshipBoundaries: TownshipBoundaryCollection | null,
  townshipRows: RankingSummary[],
  schoolPoints: SchoolMapPoint[],
  currentMapZoom?: number | null,
  _currentMapCenter?: [number, number] | null,
) {
  void _currentMapCenter

  const activeCounty = useMemo(
    () => counties.find((c) => c.id === activeCountyId) ?? null,
    [activeCountyId, counties],
  )
  const countyLookup = useMemo(() => new Map(counties.map((c) => [c.id, c])), [counties])
  const townshipLookup = useMemo(() => new Map(townshipRows.map((t) => [t.id, t])), [townshipRows])

  const countyCenterLookup = useMemo(() => {
    const lookup = new Map<string, [number, number]>()
    for (const feature of countyBoundaries.features) {
      const lat = feature.properties?.centerLatitude
      const lng = feature.properties?.centerLongitude
      const countyId = feature.properties?.countyId
      if (countyId && typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        lookup.set(countyId, resolveCountyMapAnchor(feature.properties))
      }
    }
    return lookup
  }, [countyBoundaries])

  const townshipCenterLookup = useMemo(() => {
    const lookup = new Map<string, [number, number]>()
    if (!townshipBoundaries) return lookup
    for (const feature of townshipBoundaries.features) {
      const lat = feature.properties?.centerLatitude
      const lng = feature.properties?.centerLongitude
      const townId = feature.properties?.townId
      if (townId && typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        lookup.set(townId, [lat, lng])
      }
    }
    return lookup
  }, [townshipBoundaries])

  const zoom = currentMapZoom ?? 7
  const visibility = computeLayerVisibility(zoom, schoolPoints.length > 0)

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
