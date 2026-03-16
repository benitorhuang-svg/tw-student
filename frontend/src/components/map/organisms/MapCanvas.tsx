import { useState } from 'react'
import { MapContainer } from 'react-leaflet'

import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_MAX_ZOOM, MAP_MAX_BOUNDS } from '../../../lib/constants'
import { MapLoadingBanner } from '../atoms/MapLoadingBanner'
import { MapTileLayer } from '../atoms/MapTileLayer'
import MapBoundsController from './MapBoundsController'
import { MapLayerStack } from '../molecules/MapLayerStack'
import { useMapComputedState } from '../useMapComputedState'
import { MapEvents } from '../atoms/MapEvents'
import { MapFloatingFilters } from '../../molecules/MapFloatingFilters'
import { AtlasMiniMap } from '../molecules/AtlasMiniMap'
import type { CountyBucketDataset, CountyBoundaryCollection, TownshipBoundaryCollection, AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter, EducationSummaryDataset } from '../../../data/educationData'
import type { CountySummary, RankingSummary } from '../../../lib/analytics.types'
import type { SchoolMapPoint } from '../types'
import type { AtlasTab } from '../../../hooks/useAtlasQueryState'
import type { TransitionStartFunction } from 'react'

export type MapCanvasProps = {
  counties: CountySummary[]
  activeRegion: '全部' | '北部' | '中部' | '南部' | '東部' | '離島'
  activeCountyId: string | null
  activeTownshipId: string | null
  theme: 'light' | 'dark'
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  townshipRows: RankingSummary[]
  allTownshipRows: RankingSummary[]
  allTownshipBoundaries: TownshipBoundaryCollection | null
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
  activeTab: AtlasTab
  activeYear: AcademicYear
  summaryYears: AcademicYear[]
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  isYearPlaybackActive: boolean
  onSetRegion: (region: RegionGroupFilter) => void
  onResetRegion: () => void
  onTogglePlayback: () => void
  onSetActiveYear: (year: AcademicYear) => void
  onStopPlayback: () => void
  onSetEducationLevel: (level: EducationLevelFilter) => void
  onSetManagementType: (type: ManagementTypeFilter) => void
  startTransition: TransitionStartFunction
  activeCountyName: string | null
  summaryDataset?: EducationSummaryDataset | null
}

/**
 * Helper to ensure UI overlays stay in their absolute-positioned containers
 * and don't leak into the Leaflet map layers.
 */
function MapUIOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="atlas-map-ui-overlay-pane">
      {children}
    </div>
  )
}

export default function MapCanvas(props: MapCanvasProps) {
  const {
    activeCountyId, activeTownshipId, theme, countyBoundaries,
    townshipBoundaries, townshipRows, allTownshipRows, allTownshipBoundaries,
    schoolPoints, selectedSchoolId, highlightedCountyId,
    highlightedTownshipId, highlightedSchoolId, isTownshipBoundaryLoading,
    onSelectSchool, initialMapZoom, initialMapLat, initialMapLon, 
    scopePath, onNavigateScope, vectorTileBaseUrl = '', forceTownshipLabels = false,
    activeTab, activeYear, summaryYears, educationLevel, managementType,
    isYearPlaybackActive, onSetRegion, onResetRegion, onTogglePlayback,
    onSetActiveYear, onStopPlayback, onSetEducationLevel, onSetManagementType,
    startTransition, activeCountyName
  } = props

  const [openShelf, setOpenShelf] = useState<string | null>(null)
  const toggleShelf = (id: string) => setOpenShelf(prev => prev === id ? null : id)

  let selectedSchool = selectedSchoolId ? schoolPoints.find((school) => school.id === selectedSchoolId) ?? null : null

  if (!selectedSchool && selectedSchoolId && props.summaryDataset?.schoolCodeIndex) {
    const entry = Object.values(props.summaryDataset.schoolCodeIndex).find(e =>
      e.schoolIds?.includes(selectedSchoolId)
    )
    if (entry?.longitude && entry?.latitude) {
      selectedSchool = {
        id: selectedSchoolId,
        name: entry.name,
        latitude: entry.latitude,
        longitude: entry.longitude,
      } as SchoolMapPoint
    }
  }

  const [hoveredCountyId, setHoveredCountyId] = useState<string | null>(null)
  const [hoveredTownshipId, setHoveredTownshipId] = useState<string | null>(null)

  const visibleTownshipRows = allTownshipRows.length > 0 ? allTownshipRows : townshipRows

  const computed = useMapComputedState(
    props.counties, activeCountyId, activeTownshipId, selectedSchoolId,
    countyBoundaries, townshipBoundaries, townshipRows, schoolPoints,
    props.currentMapZoom ?? null, undefined
  )

  return (
    <section className="panel atlas-map-panel">
      <div className="atlas-map-shell">
        <div className="atlas-map-canvas-wrap" data-township-markers={forceTownshipLabels ? 'true' : 'false'}>
          <MapLoadingBanner isLoading={isTownshipBoundaryLoading} message="正在同步縣市鄉鎮界線…" />
          
          <MapContainer
            center={[initialMapLat ?? MAP_DEFAULT_CENTER[0], initialMapLon ?? MAP_DEFAULT_CENTER[1]]}
            zoom={initialMapZoom ?? MAP_DEFAULT_ZOOM}
            minZoom={MAP_DEFAULT_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            maxBounds={MAP_MAX_BOUNDS}
            maxBoundsViscosity={1.0}
            zoomControl={false}
            zoomSnap={0.1}
            zoomDelta={0.5}
            className="atlas-map-canvas"
            attributionControl={false}
            preferCanvas={true}
          >
            <MapTileLayer theme={theme} />
            <MapEvents onBackgroundClick={() => {
              if (selectedSchoolId) onSelectSchool(null)
            }} />

            <MapLayerStack
              {...props}
              {...computed}
              hoveredCountyId={hoveredCountyId}
              hoveredTownshipId={hoveredTownshipId}
              setHoveredCountyId={setHoveredCountyId}
              setHoveredTownshipId={setHoveredTownshipId}
              visibleTownshipRows={visibleTownshipRows}
              selectedSchoolId={selectedSchoolId}
              selectedSchoolPoint={selectedSchool}
              vectorTileBaseUrl={vectorTileBaseUrl}
              onVectorTileError={props.onVectorTileError ?? (() => {})}
              onHoverCounty={props.onHoverCounty ?? (() => {})}
              highlightedCountyId={highlightedCountyId ?? null}
              highlightedTownshipId={highlightedTownshipId ?? null}
              highlightedSchoolId={highlightedSchoolId ?? null}
              currentMapZoom={props.currentMapZoom ?? null}
              allTownshipBoundaries={allTownshipBoundaries}
              forceTownshipLabels={forceTownshipLabels}
            />
            
            <MapBoundsController
              {...props}
              selectedSchoolPoint={selectedSchool}
              initialZoomFromUrl={initialMapZoom}
              initialLatFromUrl={initialMapLat}
              initialLonFromUrl={initialMapLon}
            />

            {/* UI Overlays Portal-like sibling container inside MapContainer */}
            <MapUIOverlay>
              <MapFloatingFilters
                activeTab={activeTab}
                activeCountyName={activeCountyName}
                region={props.activeRegion}
                activeYear={activeYear}
                summaryYears={summaryYears}
                educationLevel={educationLevel}
                managementType={managementType}
                isYearPlaybackActive={isYearPlaybackActive}
                openShelf={openShelf}
                onToggleShelf={toggleShelf}
                onSetRegion={onSetRegion}
                onResetRegion={onResetRegion}
                onTogglePlayback={onTogglePlayback}
                onSetActiveYear={onSetActiveYear}
                onStopPlayback={onStopPlayback}
                onSetEducationLevel={onSetEducationLevel}
                onSetManagementType={onSetManagementType}
                startTransition={startTransition}
              />

              <div className="map-bottom-right-stack">
                <AtlasMiniMap 
                  countyBoundaries={countyBoundaries as any}
                  activeCountyId={activeCountyId}
                  onSelectCounty={props.onSelectCounty}
                  isVisible={true}
                  scopePath={scopePath}
                  onNavigateScope={onNavigateScope}
                />
              </div>
            </MapUIOverlay>
          </MapContainer>
        </div>
      </div>
    </section>
  )
}
