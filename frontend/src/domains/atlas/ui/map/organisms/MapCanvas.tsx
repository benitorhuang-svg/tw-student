import { useMemo, useState, type ReactNode } from 'react'
import { MapContainer } from 'react-leaflet'

import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_MAX_ZOOM, MAP_MAX_BOUNDS } from '@/shared/lib/utils/constants'
import { MapTileLayer } from '../atoms/MapTileLayer'
import MapBoundsController from './MapBoundsController'
import { MapLayerStack } from '../molecules/MapLayerStack'
import { useMapComputedState } from '../useMapComputedState'
import { MapEvents } from '../atoms/MapEvents'
import MapBreadcrumb from '../atoms/MapBreadcrumb'

import { MapTrendCard } from '../molecules/MapTrendCard'
import { MapControlStack } from '../molecules/MapControlStack'
import { MapSchoolRankingPanel } from '../molecules/MapSchoolRankingPanel'
import { AtlasMiniMap } from '../molecules/AtlasMiniMap'
import { MapZoomControls } from '../atoms/MapZoomControls'
import { MapYearStepper } from '../atoms/MapYearStepper'
import { useIsMobile } from '@/shared/lib/hooks/core/useIsMobile'

import type { CountyBucketDataset, CountyBoundaryCollection, TownshipBoundaryCollection, AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter, EducationSummaryDataset } from '@/shared/api/data/educationData'
import type { CountySummary, RankingSummary } from '@/shared/lib/analytics'
import type { SchoolMapPoint } from '../types'
import type { TransitionStartFunction } from 'react'
import { type AtlasTab } from "@/shared/lib/atlas";

function toFiniteZoom(zoom: unknown): number | null {
  return typeof zoom === 'number' && Number.isFinite(zoom) ? zoom : null
}

type MapFilterSlotOptions = {
  hideIcon?: boolean
}

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
  renderManagementTypeFilter?: (options?: MapFilterSlotOptions) => ReactNode
  renderEducationLevelFilter?: (options?: MapFilterSlotOptions) => ReactNode
}

export default function MapCanvas(props: MapCanvasProps) {
  const {
    activeCountyId, activeTownshipId, theme, countyBoundaries,
    townshipBoundaries, townshipRows, allTownshipRows, allTownshipBoundaries,
    schoolPoints, selectedSchoolId, highlightedCountyId,
    highlightedTownshipId, highlightedSchoolId,
    onSelectSchool, initialMapZoom, initialMapLat, initialMapLon,
    scopePath, onNavigateScope, vectorTileBaseUrl = '', forceTownshipLabels = false,
    activeTab, activeCountyName
  } = props

  const isMobile = useIsMobile()
  const resolvedInitialMapZoom = toFiniteZoom(initialMapZoom)
  const resolvedCurrentMapZoom = toFiniteZoom(props.currentMapZoom)

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
    resolvedCurrentMapZoom, undefined
  )

  return (
    <section className="panel atlas-map-panel">
      <div className="atlas-map-shell">
        <div className="atlas-map-canvas-wrap" data-township-markers={forceTownshipLabels ? 'true' : 'false'}>

            <MapContainer
              center={[initialMapLat ?? MAP_DEFAULT_CENTER[0], initialMapLon ?? MAP_DEFAULT_CENTER[1]]}
              zoom={resolvedInitialMapZoom ?? MAP_DEFAULT_ZOOM}
              preferCanvas={true}
              minZoom={MAP_DEFAULT_ZOOM}
              maxZoom={MAP_MAX_ZOOM}
              maxBounds={MAP_MAX_BOUNDS}
              maxBoundsViscosity={1.0}
              zoomControl={false}
              zoomSnap={0}
              zoomDelta={1}
              className="atlas-map-canvas"
              attributionControl={false}
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
              currentMapZoom={resolvedCurrentMapZoom}
              allTownshipBoundaries={allTownshipBoundaries}
              forceTownshipLabels={forceTownshipLabels}
            />

            <MapBoundsController
              {...props}
              isMobile={isMobile}
              selectedSchoolPoint={selectedSchool}
              initialZoomFromUrl={resolvedInitialMapZoom}
              initialLatFromUrl={initialMapLat}
              initialLonFromUrl={initialMapLon}
            />

            {/* Utility Pod: Context-based controls */}
            <div
              className={isMobile ? "mobile-utility-pod" : "map-control-pillar"}
              style={{
                position: 'absolute',
                top: isMobile ? '55px' : '55px',
                left: isMobile ? '6px' : '16px',
                bottom: 'auto',
                right: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: isMobile ? '8px' : '12px',
                zIndex: 1000
              }}
            >
              <AtlasMiniMap
                countyBoundaries={countyBoundaries}
                activeCountyId={activeCountyId}
                onSelectCounty={props.onSelectCounty}
                isVisible={true}
                style={{ marginLeft: 0 }}
              />
              <div style={{ pointerEvents: 'auto' }}>
                <MapZoomControls isMobile={isMobile} />
              </div>
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
                {/* MapBreadcrumb is now shown on both mobile and desktop here */}
                <MapBreadcrumb scopePath={scopePath} onNavigate={onNavigateScope} />
              </div>

              {/* 2. Right Side: Top Right Tower */}
              <div
                className="map-top-right-tower"
                style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px', pointerEvents: 'auto' }}
              >
                <div style={{ width: isMobile ? 'auto' : '140px' }}>
                  {props.renderManagementTypeFilter?.(isMobile ? { hideIcon: true } : {})}
                </div>
                <div style={{ width: isMobile ? 'auto' : '140px' }}>
                  {props.renderEducationLevelFilter?.(isMobile ? { hideIcon: true } : {})}
                </div>
              </div>
          </div>

            {/* 2C. Bottom Right Controls (Trend Card + Year Stepper) */}
            {isMobile && (
              <div
                className="map-mobile-controls-bottom-right"
                style={{
                  position: 'absolute',
                  bottom: '15px',
                  right: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '8px',
                  zIndex: 1050,
                  pointerEvents: 'none'
                }}
              >
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
              </div>
            )}

            {/* 2D. Bottom Right Controls (Desktop Year Badge) */}
            {!isMobile && (
              <div
                className="map-desktop-controls-bottom-right"
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '8px',
                  zIndex: 1050,
                  pointerEvents: 'none'
                }}
              >
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
                    letterSpacing: '0.02em',
                    pointerEvents: 'auto'
                  }}
                >
                  {String(parseInt(String(props.activeYear)) + 1910)} - {String(parseInt(String(props.activeYear)) + 1911)}
                </div>
              </div>
            )}

            <div className="map-school-ranking-dock">
              <MapSchoolRankingPanel
                schools={schoolPoints.filter(s =>
                  (!activeCountyId || s.countyId === activeCountyId) &&
                  (!activeTownshipId || s.townshipId === activeTownshipId)
                )}
                selectedSchoolId={selectedSchoolId}
                onSelectSchool={onSelectSchool}
              />
            </div>
          </div>
        </div>
      </section>
  )
}
