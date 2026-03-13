import { useEffect, useState } from 'react'
import {
  MAP_DEFAULT_ZOOM,
  MAP_TOWNSHIP_ZOOM,
} from '../lib/constants'
import { loadTownshipBoundaries } from '../data/atlasBoundaries'
import MapCanvas from './map/organisms/MapCanvas'
import type { FeatureCollection } from 'geojson'
import type {
  CountyBucketDataset,
  CountyBoundaryCollection,
  TownshipBoundaryCollection,
} from '../data/educationData'
import type { CountySummary, RankingSummary } from '../lib/analytics'
import type { SchoolMapPoint } from './map/types'

export type { SchoolMapPoint } from './map/types'

type TaiwanExplorerMapProps = {
  counties: CountySummary[]
  activeRegion: '全部' | '北部' | '中部' | '南部' | '東部' | '離島'
  activeCountyId: string | null
  activeTownshipId: string | null
  activeTab: 'overview' | 'regional' | 'county' | 'schools' | 'school-focus'
  theme: 'light' | 'dark'
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  townshipRows: RankingSummary[]
  allTownshipRows: RankingSummary[]
  schoolPoints: SchoolMapPoint[]
  countyBuckets: CountyBucketDataset | null
  selectedSchoolId: string | null
  highlightedCountyId?: string | null
  highlightedTownshipId?: string | null
  highlightedSchoolId?: string | null
  isTownshipBoundaryLoading: boolean
  mapResetToken: number
  onSelectCounty: (countyId: string, options?: { skipTabSwitch?: boolean }) => void
  onAutoSelectCounty?: (countyId: string) => void
  onSelectTownship: (townshipId: string, options?: { skipTabSwitch?: boolean }) => void
  onSelectSchool: (schoolId: string | null) => void
  onHoverCounty?: (countyId: string | null) => void
  onZoomChange?: (zoom: number) => void
  onMoveEnd?: (lat: number, lon: number) => void
  currentMapZoom?: number | null
  initialMapZoom?: number | null
  initialMapLat?: number | null
  initialMapLon?: number | null
  scopePath: string[]
  onNavigateScope: (depth: number) => void
  /**
   * Optional base URL for vector tile service.  Tiles are expected at
   * `${baseUrl}/county/{z}/{x}/{y}.pbf` and similarly for `township`.
   * When present the component will render boundaries via Leaflet.VectorGrid
   * instead of `GeoJSON`.
   */
  vectorTileBaseUrl?: string
  onVectorTileError?: () => void
  forceTownshipLabels?: boolean
}

function TaiwanExplorerMap({
  counties,
  activeRegion,
  activeCountyId,
  activeTownshipId,
  theme,
  countyBoundaries,
  townshipBoundaries,
  townshipRows,
  allTownshipRows,
  schoolPoints,
  countyBuckets,
  selectedSchoolId,
  highlightedCountyId = null,
  highlightedTownshipId = null,
  highlightedSchoolId = null,
  isTownshipBoundaryLoading,
  mapResetToken,
  onSelectCounty,
  onAutoSelectCounty,
  onSelectTownship,
  onSelectSchool,
  onHoverCounty,
  onZoomChange,
  onMoveEnd,
  currentMapZoom = null,
  initialMapZoom = null,
  initialMapLat = null,
  initialMapLon = null,
  scopePath,
  onNavigateScope,
  vectorTileBaseUrl = '',
  onVectorTileError,
  forceTownshipLabels = false,
}: TaiwanExplorerMapProps) {
  const [allTownshipBoundaries, setAllTownshipBoundaries] = useState<TownshipBoundaryCollection | null>(null)
  const [isLoadingAllTownships, setIsLoadingAllTownships] = useState(false)

  // The UI requirement is that once the map is zoomed in to level 11 the
  // user must be able to see *every* township polygon across Taiwan – this
  // allows 嘉縣 users to notice 嘉市 townships (and vice‑versa) and also makes
  // the experience consistent for every county.  To avoid a momentary blank
  // canvas when the user *arrives* at zoom 11, we start the fetch one step
  // earlier (zoom 10) and display a loading banner while the merge happens.
  useEffect(() => {
    const zoom = currentMapZoom ?? MAP_DEFAULT_ZOOM
    // begin fetching at zoom (MAP_TOWNSHIP_ZOOM - 1) so that data is ready by the time the user
    // actually reaches MAP_TOWNSHIP_ZOOM
    if (zoom < MAP_TOWNSHIP_ZOOM - 2) return
    if (allTownshipBoundaries || isLoadingAllTownships) return

    let cancelled = false
    setIsLoadingAllTownships(true)

    ;(async () => {
      try {
        const results = await Promise.allSettled<TownshipBoundaryCollection>(counties.map((c) => loadTownshipBoundaries(c.id)))
        if (cancelled) return
        const features: FeatureCollection['features'] = []
        for (const res of results) {
          if (res.status === 'fulfilled') {
            const val = res.value
            if (val && Array.isArray(val.features)) {
              features.push(...val.features)
            }
          }
        }
        if (!cancelled && features.length > 0) {
          setAllTownshipBoundaries({ type: 'FeatureCollection', features } as TownshipBoundaryCollection)
        }
      } catch {
        // ignore network errors — leave as null
      } finally {
        if (!cancelled) setIsLoadingAllTownships(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [currentMapZoom, counties, allTownshipBoundaries, isLoadingAllTownships])

  return (
    <MapCanvas
      counties={counties}
      activeRegion={activeRegion}
      activeCountyId={activeCountyId}
      activeTownshipId={activeTownshipId}
      theme={theme}
      countyBoundaries={countyBoundaries}
      townshipBoundaries={townshipBoundaries}
      townshipRows={townshipRows}
      allTownshipRows={allTownshipRows}
      allTownshipBoundaries={allTownshipBoundaries}
      schoolPoints={schoolPoints}
      countyBuckets={countyBuckets}
      selectedSchoolId={selectedSchoolId}
      highlightedCountyId={highlightedCountyId}
      highlightedTownshipId={highlightedTownshipId}
      highlightedSchoolId={highlightedSchoolId}
      isTownshipBoundaryLoading={isTownshipBoundaryLoading}
      mapResetToken={mapResetToken}
      onSelectCounty={onSelectCounty}
      onAutoSelectCounty={onAutoSelectCounty}
      onSelectTownship={onSelectTownship}
      onSelectSchool={onSelectSchool}
      onHoverCounty={onHoverCounty}
      onZoomChange={onZoomChange}
      onMoveEnd={onMoveEnd}
      currentMapZoom={currentMapZoom}
      initialMapZoom={initialMapZoom}
      initialMapLat={initialMapLat}
      initialMapLon={initialMapLon}
      scopePath={scopePath}
      onNavigateScope={onNavigateScope}
      vectorTileBaseUrl={vectorTileBaseUrl}
      onVectorTileError={onVectorTileError}
      forceTownshipLabels={forceTownshipLabels}
    />
  )
}

export default TaiwanExplorerMap