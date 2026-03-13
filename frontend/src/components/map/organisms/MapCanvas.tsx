import { useState } from 'react'
import { MapContainer, ZoomControl } from 'react-leaflet'

import { MAP_DEFAULT_ZOOM } from '../../../lib/constants'
import MapBreadcrumb from '../atoms/MapBreadcrumb'
import { MapLoadingBanner } from '../atoms/MapLoadingBanner'
import { MapTileLayer } from '../atoms/MapTileLayer'
import AllTownshipLabels from '../molecules/AllTownshipLabels'
import MapBoundsController from './MapBoundsController'
import VisibleSchoolMarkers from './VisibleSchoolMarkers'
import VectorTileBoundaryLayer from './VectorTileBoundaryLayer'
import { CountyBoundaryLayer } from './CountyBoundaryLayer'
import { TownshipBoundaryLayer } from './TownshipBoundaryLayer'
import { CountyMarkerLayer } from './CountyMarkerLayer'
import { useMapComputedState } from '../useMapComputedState'
import type { CountyBucketDataset, CountyBoundaryCollection, TownshipBoundaryCollection } from '../../../data/educationData'
import type { CountySummary, RankingSummary } from '../../../lib/analytics'
import type { SchoolMapPoint } from '../types'

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
}

export default function MapCanvas({
  counties,
  activeRegion,
  activeCountyId,
  activeTownshipId,
  theme,
  countyBoundaries,
  townshipBoundaries,
  townshipRows,
  allTownshipRows,
  allTownshipBoundaries,
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
}: MapCanvasProps) {
  const selectedSchool = selectedSchoolId ? schoolPoints.find((school) => school.id === selectedSchoolId) ?? null : null
  const [hoveredCountyId, setHoveredCountyId] = useState<string | null>(null)
  const [hoveredTownshipId, setHoveredTownshipId] = useState<string | null>(null)

  const visibleTownshipRows: RankingSummary[] = allTownshipRows.length > 0 ? allTownshipRows : townshipRows

  const {
    countyLookup,
    townshipLookup,
    countyCenterLookup,
    showCountyMarkers,
    showTownshipMarkers,
  } = useMapComputedState(
    counties,
    activeCountyId,
    activeTownshipId,
    selectedSchoolId,
    countyBoundaries,
    townshipBoundaries,
    townshipRows,
    schoolPoints,
    currentMapZoom,
    undefined,
  )

  return (
    <section className="panel atlas-map-panel">
      <div className="atlas-map-shell">
        <div className="atlas-map-canvas-wrap" data-township-markers={forceTownshipLabels ? 'true' : 'false'}>
          <MapLoadingBanner isLoading={isTownshipBoundaryLoading} message="正在同步縣市鄉鎮界線…" />
          <MapBreadcrumb scopePath={scopePath} onNavigate={onNavigateScope} />
          <div className="atlas-map-selection-status atlas-map-selection-status--hidden" data-testid="map-selection-status" aria-hidden="true">
            {selectedSchool ? `目前地圖聚焦：${selectedSchool.name}` : activeCountyId ? `目前地圖聚焦：${activeCountyId}` : '目前地圖聚焦：全台灣'}
          </div>
          <MapContainer
            center={[initialMapLat ?? 24.4444, initialMapLon ?? 120.2500]}
            zoom={initialMapZoom ?? MAP_DEFAULT_ZOOM}
            minZoom={MAP_DEFAULT_ZOOM}
            maxZoom={13}
            zoomControl={false}
            className="atlas-map-canvas"
            attributionControl={false}
          >
            <MapTileLayer theme={theme} />
            <ZoomControl position="bottomright" />

            {vectorTileBaseUrl ? (
              <VectorTileBoundaryLayer
                baseUrl={vectorTileBaseUrl}
                onError={onVectorTileError}
                activeCountyId={activeCountyId}
                activeTownshipId={activeTownshipId}
                highlightedCountyId={highlightedCountyId}
                highlightedTownshipId={highlightedTownshipId}
                onSelectCounty={onSelectCounty}
                onSelectTownship={onSelectTownship}
                countyLookup={countyLookup}
                townshipLookup={new Map(allTownshipRows.map((t) => [t.id, t]))}
              />
            ) : (
              <>
                <CountyBoundaryLayer
                  countyBoundaries={countyBoundaries}
                  countyLookup={countyLookup}
                  activeCountyId={activeCountyId}
                  hoveredFeatureId={hoveredCountyId}
                  highlightedCountyId={highlightedCountyId}
                  theme={theme}
                  showMarkers={showCountyMarkers}
                  onSelectCounty={onSelectCounty}
                  onHoverCounty={onHoverCounty ?? (() => {})}
                  setHoveredFeatureId={setHoveredCountyId}
                />
                {townshipBoundaries ? (
                  <TownshipBoundaryLayer
                    data={townshipBoundaries}
                    townshipLookup={townshipLookup}
                    activeTownshipId={activeTownshipId}
                    hoveredFeatureId={hoveredTownshipId}
                    highlightedTownshipId={highlightedTownshipId}
                    theme={theme}
                    showMarkers={showTownshipMarkers}
                    onSelectTownship={onSelectTownship}
                    setHoveredFeatureId={setHoveredTownshipId}
                  />
                ) : null}
              </>
            )}

            <CountyMarkerLayer
              counties={counties}
              countyCenterLookup={countyCenterLookup}
              countyBoundaries={countyBoundaries}
              currentMapZoom={currentMapZoom}
              activeCountyId={activeCountyId}
              onSelectCounty={onSelectCounty}
            />

            <AllTownshipLabels
              onSelectTownship={onSelectTownship}
              hiddenTownshipId={activeTownshipId}
              visibleTownshipIds={visibleTownshipRows.map((r) => r.id)}
              forceShowAll={forceTownshipLabels}
              townshipBoundaries={allTownshipBoundaries}
            />

            <VisibleSchoolMarkers
              countyBuckets={countyBuckets}
              schoolPoints={schoolPoints}
              selectedSchoolId={selectedSchoolId}
              highlightedSchoolId={highlightedSchoolId}
              onSelectSchool={onSelectSchool}
            />

            <MapBoundsController
              countyBoundaries={countyBoundaries}
              townshipBoundaries={townshipBoundaries}
              activeCountyId={activeCountyId}
              activeTownshipId={activeTownshipId}
              selectedSchoolPoint={selectedSchool}
              activeRegion={activeRegion}
              mapResetToken={mapResetToken}
              onZoomChange={onZoomChange}
              onMoveEnd={onMoveEnd}
              onAutoSelectCounty={onAutoSelectCounty}
              initialZoomFromUrl={initialMapZoom}
              initialLatFromUrl={initialMapLat}
              initialLonFromUrl={initialMapLon}
            />
          </MapContainer>
        </div>
      </div>
    </section>
  )
}
