import { useMemo, useState } from 'react'
import { MapContainer } from 'react-leaflet'

import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_MAX_ZOOM, MAP_MAX_BOUNDS } from '../../../lib/constants'
import { MapTileLayer } from '../atoms/MapTileLayer'
import MapBoundsController from './MapBoundsController'
import { MapLayerStack } from '../molecules/MapLayerStack'
import { useMapComputedState } from '../useMapComputedState'
import { MapEvents } from '../atoms/MapEvents'
import MapBreadcrumb from '../atoms/MapBreadcrumb'

import { MapTrendCard } from '../molecules/MapTrendCard'
import { MapControlStack } from '../molecules/MapControlStack'
import { AtlasLevelFilter, AtlasTypeFilter } from '../../AtlasGlobalFilters'
import { AtlasMiniMap } from '../molecules/AtlasMiniMap'
import { MapZoomControls } from '../atoms/MapZoomControls'
import { MapYearStepper } from '../atoms/MapYearStepper'
import { useIsMobile } from '../../../hooks/useIsMobile'

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
  onSetRegion: (region: RegionGroupFilter) => void
  onResetRegion: () => void
  onSetActiveYear: (year: AcademicYear) => void
  onStopPlayback: () => void
  onTogglePlayback: () => void
  onSetEducationLevel: (level: EducationLevelFilter) => void
  onSetManagementType: (type: ManagementTypeFilter) => void
  isYearPlaybackActive: boolean
  startTransition: TransitionStartFunction
  activeCountyName: string | null
  summaryDataset?: EducationSummaryDataset | null
  currentTrend?: Array<{ year: AcademicYear; value: number }>
  currentLabel?: string
  currentLevel?: string
}

export default function MapCanvas(props: MapCanvasProps) {
  const {
    activeCountyId, activeTownshipId, theme, countyBoundaries,
    townshipBoundaries, townshipRows, allTownshipRows, allTownshipBoundaries,
    schoolPoints, selectedSchoolId, highlightedCountyId,
    highlightedTownshipId, highlightedSchoolId,
    onSelectSchool, initialMapZoom, initialMapLat, initialMapLon, 
    scopePath, onNavigateScope, vectorTileBaseUrl = '', forceTownshipLabels = false,
    activeTab, educationLevel, managementType,
    onSetEducationLevel, onSetManagementType,
    startTransition, activeCountyName
  } = props

  const isMobile = useIsMobile()

  const selectedSchool = useMemo(() => {
    const directMatch = selectedSchoolId
      ? schoolPoints.find((school) => school.id === selectedSchoolId) ?? null
      : null

    if (directMatch || !selectedSchoolId || !props.summaryDataset?.schoolCodeIndex) {
      return directMatch
    }

    const entry = Object.values(props.summaryDataset.schoolCodeIndex).find((value) =>
      value.schoolIds?.includes(selectedSchoolId),
    )
    if (entry?.longitude && entry?.latitude) {
      return {
        id: selectedSchoolId,
        name: entry.name,
        latitude: entry.latitude,
        longitude: entry.longitude,
      } as SchoolMapPoint
    }

    return null
  }, [props.summaryDataset, schoolPoints, selectedSchoolId])

  const [hoveredCountyId, setHoveredCountyId] = useState<string | null>(null)
  const [hoveredTownshipId, setHoveredTownshipId] = useState<string | null>(null)

  const visibleTownshipRows = useMemo(
    () => (allTownshipRows.length > 0 ? allTownshipRows : townshipRows),
    [allTownshipRows, townshipRows],
  )

  const computed = useMapComputedState(
    props.counties, activeCountyId, activeTownshipId,
    countyBoundaries, townshipBoundaries, townshipRows, schoolPoints,
    props.currentMapZoom ?? null, undefined
  )

  return (
    <section className="panel atlas-map-panel">
      <div className="atlas-map-shell">
        <div className="atlas-map-canvas-wrap" data-township-markers={forceTownshipLabels ? 'true' : 'false'}>
          
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
              inertia={false}
              zoomAnimation={true}
              fadeAnimation={false}
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
              isMobile={isMobile}
              selectedSchoolPoint={selectedSchool}
              initialZoomFromUrl={initialMapZoom}
              initialLatFromUrl={initialMapLat}
              initialLonFromUrl={initialMapLon}
            />

            {/* Utility Pod: Context-based controls */}
            <div 
              className={isMobile ? "mobile-utility-pod" : "map-control-pillar"}
              style={isMobile ? { 
                position: 'absolute', 
                bottom: '15px', 
                right: '6px', 
                top: 'auto',
                left: 'auto',
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'flex-end', 
                gap: '8px', 
                zIndex: 1000 
              } : {
                position: 'absolute',
                bottom: '16px',
                top: 'auto',
                left: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 1000
              }}
            >
              {isMobile ? (
                <>
                  <AtlasMiniMap 
                    countyBoundaries={countyBoundaries}
                    activeCountyId={activeCountyId}
                    onSelectCounty={props.onSelectCounty}
                    isVisible={true}
                    style={{ marginLeft: 0 }}
                  />
                  <div style={{ pointerEvents: 'auto', marginRight: '8px' }}>
                    <MapZoomControls isMobile={isMobile} />
                  </div>
                  <div 
                    className="mobile-filter-stack"
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '6px', 
                      pointerEvents: 'auto',
                      width: '110px',
                      marginTop: '4px',
                      marginRight: '3px'
                    }}
                  >
                    <AtlasTypeFilter
                      managementType={managementType}
                      onSetManagementType={onSetManagementType}
                      startTransition={startTransition}
                      hideIcon={isMobile}
                    />
                    <AtlasLevelFilter
                      educationLevel={educationLevel}
                      onSetEducationLevel={onSetEducationLevel}
                      startTransition={startTransition}
                      hideIcon={isMobile}
                    />
                  </div>
                </>
              ) : (
                <>
                  <MapZoomControls isMobile={isMobile} />
                  <AtlasMiniMap 
                    countyBoundaries={countyBoundaries}
                    activeCountyId={activeCountyId}
                    onSelectCounty={props.onSelectCounty}
                    isVisible={true}
                    style={{ marginLeft: 0 }}
                  />
                </>
              )}
            </div>

            <MapControlStack
              activeTab={activeTab}
              activeCountyName={activeCountyName}
            />
          </MapContainer>

          {/* Map UI Layer: Overlays above the leaflet canvas */}
          <div 
            className="map-top-bar"
            style={{ 
              position: 'absolute', 
              top: isMobile ? '10px' : '16px', 
              left: 0, 
              right: 0, 
              width: '100%', 
              zIndex: 1100, 
              pointerEvents: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0 8px'
            }}
          >
              {/* 1. Left Cluster: Cockpit Pod (Breadcrumb + Controls) */}
              <div 
                className="map-top-bar__controls-left"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', pointerEvents: 'auto' }}
              >
                {/* MapBreadcrumb is moved to the right on mobile */}
                {!isMobile && <MapBreadcrumb scopePath={scopePath} onNavigate={onNavigateScope} />}
                {/* 1A. Western Year Correlation - Width Fixed to 140px */}
                {!isMobile && (
                  <div 
                    className="map-western-year-badge"
                    style={{
                      height: '40px',
                      width: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--map-overlay-bg)',
                      backdropFilter: 'blur(var(--map-overlay-blur))',
                      border: '1px solid var(--map-overlay-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: 'var(--brand-primary)',
                      boxShadow: 'var(--shadow-premium)',
                      letterSpacing: '0.02em'
                    }}
                  >
                    {String(parseInt(String(props.activeYear)) + 1910)} - {String(parseInt(String(props.activeYear)) + 1911)}
                  </div>
                )}

                {/* 1B. Filters - All unified to 140px width */}
                {!isMobile && (
                  <>
                    <div style={{ width: '140px' }}>
                      <AtlasTypeFilter
                        managementType={managementType}
                        onSetManagementType={onSetManagementType}
                        startTransition={startTransition}
                      />
                    </div>
                    <div style={{ width: '140px' }}>
                      <AtlasLevelFilter
                        educationLevel={educationLevel}
                        onSetEducationLevel={onSetEducationLevel}
                        startTransition={startTransition}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* 2. Right Side: Top Right Tower */}
              <div 
                className="map-top-right-tower" 
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', pointerEvents: 'auto' }}
              >
                {/* MapBreadcrumb is now in the utility pod for mobile */}
              </div>
          </div>

          {/* 2. Bottom-Left Overlay: Unified Control Stack (Filters + Trend Card + Year Stepper) */}
          {isMobile && (
            <div 
              className="map-mobile-controls-bottom-left"
              style={{ 
                position: 'absolute', 
                bottom: '15px', 
                left: '5px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                zIndex: 1050,
                pointerEvents: 'none'
              }}
            >
              {/* Filters moved to the right side pod */}

              {/* 2B. Trend Card */}
              {props.currentTrend && props.currentLevel && props.currentLevel !== '全台' && (
                <div style={{ pointerEvents: 'auto' }}>
                  <MapTrendCard 
                    trend={props.currentTrend} 
                    activeYear={props.activeYear} 
                    label={props.currentLabel || '全台'}
                    level={props.currentLevel}
                  />
                </div>
              )}

              {/* 2C. Year Stepper (學年度) - Now below the Trend Card */}
              <div style={{ pointerEvents: 'auto' }}>
                <MapYearStepper
                  activeYear={props.activeYear}
                  summaryYears={props.summaryYears}
                  isYearPlaybackActive={props.isYearPlaybackActive}
                  onSetActiveYear={props.onSetActiveYear}
                  onStopPlayback={props.onStopPlayback}
                  onTogglePlayback={props.onTogglePlayback}
                  startTransition={props.startTransition}
                />
              </div>

              {/* 2D. Map Breadcrumb (導覽膠囊) - Now at the very bottom left */}
              <div style={{ pointerEvents: 'auto', marginTop: '2px' }}>
                <MapBreadcrumb scopePath={scopePath} onNavigate={onNavigateScope} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
