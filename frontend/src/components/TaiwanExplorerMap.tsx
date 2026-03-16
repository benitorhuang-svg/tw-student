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
  AcademicYear,
  EducationLevelFilter,
  ManagementTypeFilter,
  RegionGroupFilter,
  EducationSummaryDataset,
} from '../data/educationData'
import type { CountySummary, RankingSummary } from '../lib/analytics'
import type { SchoolMapPoint } from './map/types'
import type { AtlasTab } from '../hooks/useAtlasQueryState'

export type { SchoolMapPoint } from './map/types'

type TaiwanExplorerMapProps = {
  counties: CountySummary[]
  activeRegion: '全部' | '北部' | '中部' | '南部' | '東部' | '離島'
  activeCountyId: string | null
  activeTownshipId: string | null
  activeTab: AtlasTab
  theme: 'light' | 'dark'
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  townshipRows: RankingSummary[]
  allTownshipRows: RankingSummary[]
  allTownshipBoundaries?: TownshipBoundaryCollection | null
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
  vectorTileBaseUrl?: string
  onVectorTileError?: () => void
  forceTownshipLabels?: boolean

  // Filter Props
  activeYear: AcademicYear
  summaryYears: AcademicYear[]
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  onSetRegion: (region: RegionGroupFilter) => void
  onResetRegion: () => void
  onSetActiveYear: (year: AcademicYear) => void
  onStopPlayback: () => void
  onSetEducationLevel: (level: EducationLevelFilter) => void
  onSetManagementType: (type: ManagementTypeFilter) => void
  startTransition: React.TransitionStartFunction
  activeCountyName: string | null
  summaryDataset?: EducationSummaryDataset | null
}

function TaiwanExplorerMap(props: TaiwanExplorerMapProps) {
  const {
    counties, activeRegion, activeCountyId, activeTownshipId, theme, 
    countyBoundaries, townshipBoundaries, townshipRows, allTownshipRows,
    allTownshipBoundaries: allTownshipBoundariesFromProp,
    schoolPoints, countyBuckets, selectedSchoolId,
    highlightedCountyId = null, highlightedTownshipId = null, highlightedSchoolId = null,
    isTownshipBoundaryLoading, mapResetToken,
    onSelectCounty, onAutoSelectCounty, onSelectTownship, onSelectSchool, onHoverCounty,
    onZoomChange, onMoveEnd, currentMapZoom = null, initialMapZoom = null,
    initialMapLat = null, initialMapLon = null, scopePath, onNavigateScope,
    vectorTileBaseUrl = '', onVectorTileError, forceTownshipLabels = false,
    activeTab, activeYear, summaryYears, educationLevel, managementType,
    onSetRegion, onResetRegion, 
    onSetActiveYear, onStopPlayback, onSetEducationLevel, onSetManagementType,
    startTransition, activeCountyName
  } = props

  const [allTownshipBoundariesLocal, setAllTownshipBoundariesLocal] = useState<TownshipBoundaryCollection | null>(null)
  const [isLoadingAllTownships, setIsLoadingAllTownships] = useState(false)

  const allTownshipBoundaries = allTownshipBoundariesFromProp || allTownshipBoundariesLocal

  useEffect(() => {
    const zoom = currentMapZoom ?? MAP_DEFAULT_ZOOM
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
          setAllTownshipBoundariesLocal({ type: 'FeatureCollection', features } as TownshipBoundaryCollection)
        }
      } catch {
        // ignore network errors
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
      activeTab={activeTab}
      activeYear={activeYear}
      summaryYears={summaryYears}
      educationLevel={educationLevel}
      managementType={managementType}
      onSetRegion={onSetRegion}
      onResetRegion={onResetRegion}
      onSetActiveYear={onSetActiveYear}
      onStopPlayback={onStopPlayback}
      onSetEducationLevel={onSetEducationLevel}
      onSetManagementType={onSetManagementType}
      startTransition={startTransition}
      activeCountyName={activeCountyName}
      summaryDataset={props.summaryDataset}
    />
  )
}

export default TaiwanExplorerMap