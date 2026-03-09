import { useState } from 'react'
import type { Feature, GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, ZoomControl } from 'react-leaflet'
import type {
  CountyBucketDataset,
  CountyBoundaryCollection,
  CountyBoundaryProperties,
  RegionGroupFilter,
  TownshipBoundaryCollection,
  TownshipBoundaryProperties,
} from '../data/educationData'
import type { CountySummary, RankingSummary } from '../lib/analytics'
import MapBreadcrumb from './map/MapBreadcrumb'
import MapBoundsController from './map/MapBoundsController'
import MapFloatingHelp from './map/MapFloatingHelp'
import {
  buildHoverPreviewHtml,
  choroplethColor,
  choroplethOpacity,
  DARK_TILE_URL,
  growthChoroplethColor,
  LIGHT_TILE_URL,
  renderHoverPreview,
  renderScopeMarkerIcon,
} from './map/mapStyles'
import TownshipDotMarkers from './map/TownshipDotMarkers'
import AllTownshipLabels from './map/AllTownshipLabels'
import { useMapComputedState } from './map/useMapComputedState'
import VisibleSchoolMarkers from './map/VisibleSchoolMarkers'
import type { SchoolMapPoint } from './map/types'

export type { SchoolMapPoint } from './map/types'
type TaiwanExplorerMapProps = {
  counties: CountySummary[]; activeRegion: RegionGroupFilter
  activeCountyId: string | null; activeTownshipId: string | null
  activeTab: 'overview' | 'regional' | 'county' | 'schools' | 'school-focus'
  theme: 'light' | 'dark'
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  townshipRows: RankingSummary[]; schoolPoints: SchoolMapPoint[]
  countyBuckets: CountyBucketDataset | null
  selectedSchoolId: string | null
  highlightedCountyId?: string | null; highlightedTownshipId?: string | null; highlightedSchoolId?: string | null
  isTownshipBoundaryLoading: boolean; mapResetToken: number
  onSelectCounty: (countyId: string) => void
  onSelectTownship: (townshipId: string) => void
  onSelectSchool: (schoolId: string | null) => void
  onHoverCounty?: (countyId: string | null) => void
  onZoomChange?: (zoom: number) => void; onMoveEnd?: (lat: number, lon: number) => void
  initialMapZoom?: number | null; initialMapLat?: number | null; initialMapLon?: number | null
  scopePath: string[]; onNavigateScope: (depth: number) => void
}

function TaiwanExplorerMap({
  counties,
  activeRegion,
  activeCountyId,
  activeTownshipId,
  activeTab,
  theme,
  countyBoundaries,
  townshipBoundaries,
  townshipRows,
  schoolPoints,
  countyBuckets,
  selectedSchoolId,
  highlightedCountyId = null,
  highlightedTownshipId = null,
  highlightedSchoolId = null,
  isTownshipBoundaryLoading,
  mapResetToken,
  onSelectCounty,
  onSelectTownship,
  onSelectSchool,
  onHoverCounty,
  onZoomChange,
  onMoveEnd,
  initialMapZoom = null,
  initialMapLat = null,
  initialMapLon = null,
  scopePath,
  onNavigateScope,
}: TaiwanExplorerMapProps) {
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null)
  const tileUrl = theme === 'dark' ? DARK_TILE_URL : LIGHT_TILE_URL
  const tileOpacity = theme === 'dark' ? 0.32 : 0.18
  const selectedSchool = selectedSchoolId ? schoolPoints.find((school) => school.id === selectedSchoolId) ?? null : null
  const previewTipOpts = { direction: 'top' as const, offset: [0, -8] as [number, number], className: 'atlas-map-tooltip atlas-map-tooltip--preview', opacity: 1 }

  const {
    activeCounty,
    countyLookup,
    townshipLookup,
    countyCenterLookup,
    townshipCenterLookup,
    showCountyMarkers,
    showTownshipMarkers,
    showSchoolMarkers,
  } = useMapComputedState(
    counties,
    activeCountyId,
    activeTownshipId,
    selectedSchoolId,
    countyBoundaries,
    townshipBoundaries,
    townshipRows,
    schoolPoints,
  )

  return (
    <section className="panel atlas-map-panel">
      <div className="atlas-map-shell">
        <div className="atlas-map-canvas-wrap">
          {isTownshipBoundaryLoading ? <div className="atlas-map-loading">正在同步縣市鄉鎮界線…</div> : null}
          <MapBreadcrumb scopePath={scopePath} onNavigate={onNavigateScope} />
          <div className="atlas-map-selection-status atlas-map-selection-status--hidden" data-testid="map-selection-status" aria-hidden="true">
            {selectedSchool ? `目前地圖聚焦：${selectedSchool.name}` : activeCounty ? `目前地圖聚焦：${activeCounty.name}` : '目前地圖聚焦：全台灣'}
          </div>
          <MapContainer
            center={[initialMapLat ?? 23.7, initialMapLon ?? 121]}
            zoom={initialMapZoom ?? 7.4}
            minZoom={7}
            maxZoom={18}
            zoomControl={false}
            className="atlas-map-canvas"
            attributionControl={false}
          >
            <TileLayer key={tileUrl} url={tileUrl} opacity={tileOpacity} attribution="© OpenStreetMap contributors © CARTO" />
            <ZoomControl position="topright" />

            <GeoJSON
              data={countyBoundaries as GeoJsonObject}
              style={(feature: Feature | undefined) => {
                const properties = feature?.properties as CountyBoundaryProperties | undefined
                const countyId = properties?.countyId ?? ''
                const summary = countyLookup.get(countyId) ?? null
                const isActive = countyId === activeCountyId
                const isHovered = countyId === hoveredFeatureId || countyId === highlightedCountyId

                if (!summary || summary.filteredOut) {
                  return {
                    color: theme === 'dark' ? '#334155' : 'rgba(115, 145, 123, 0.34)',
                    weight: 1,
                    fillColor: theme === 'dark' ? '#0f172a' : '#edf7ee',
                    fillOpacity: theme === 'dark' ? 0.12 : 0.72,
                  }
                }

                return {
                  color: isActive || isHovered ? (theme === 'dark' ? '#e2e8f0' : '#f8fffb') : 'rgba(126, 168, 137, 0.42)',
                  weight: isActive ? 2.2 : isHovered ? 1.8 : 1.1,
                  fillColor: isActive ? '#b8d7be' : choroplethColor(summary.students),
                  fillOpacity: activeCountyId && !isActive ? 0.1 : choroplethOpacity(summary.students),
                }
              }}
              onEachFeature={(feature: Feature, layer: L.Layer) => {
                const properties = feature.properties as CountyBoundaryProperties
                const summary = countyLookup.get(properties.countyId) ?? null
                if (summary && !showCountyMarkers) {
                  layer.bindTooltip(buildHoverPreviewHtml(summary.name, summary.students, summary.schools, summary.delta, summary.region), previewTipOpts)
                }
                layer.on({
                  click: () => onSelectCounty(properties.countyId),
                  mouseover: () => {
                    setHoveredFeatureId(properties.countyId)
                    onHoverCounty?.(properties.countyId)
                    layer.openTooltip?.()
                  },
                  mouseout: () => {
                    setHoveredFeatureId(null)
                    onHoverCounty?.(null)
                    layer.closeTooltip?.()
                  },
                })
              }}
            />

            {activeCounty && townshipBoundaries ? (
              <GeoJSON
                data={townshipBoundaries as GeoJsonObject}
                style={(feature: Feature | undefined) => {
                  const properties = feature?.properties as TownshipBoundaryProperties | undefined
                  const townshipId = properties?.townId ?? ''
                  const summary = townshipLookup.get(townshipId) ?? null
                  const isActive = townshipId === activeTownshipId
                  const isHovered = townshipId === hoveredFeatureId || townshipId === highlightedTownshipId

                  return {
                    color: isActive || isHovered ? (theme === 'dark' ? '#f8fafc' : '#fbfffd') : 'rgba(124, 158, 133, 0.38)',
                    weight: isActive ? 2.1 : isHovered ? 1.7 : 1,
                    fillColor: isActive ? '#cfe6d3' : choroplethColor(summary?.students ?? 0),
                    fillOpacity: summary ? Math.max(0.07, choroplethOpacity(summary.students) - 0.04) : 0.08,
                  }
                }}
                onEachFeature={(feature: Feature, layer: L.Layer) => {
                  const properties = feature.properties as TownshipBoundaryProperties
                  const summary = townshipLookup.get(properties.townId) ?? null
                  if (summary && !showTownshipMarkers) {
                    layer.bindTooltip(buildHoverPreviewHtml(summary.label, summary.students, summary.schools, summary.delta, properties.countyName), previewTipOpts)
                  }
                  layer.on({
                    click: () => onSelectTownship(properties.townId),
                    mouseover: () => {
                      setHoveredFeatureId(properties.townId)
                      layer.openTooltip?.()
                    },
                    mouseout: () => {
                      setHoveredFeatureId(null)
                      layer.closeTooltip?.()
                    },
                  })
                }}
              />
            ) : null}

            {showCountyMarkers
              ? counties.map((county) => {
                  const center = countyCenterLookup.get(county.id)
                  if (!center) return null
                  return (
                    <Marker
                      key={`county-marker-${county.id}`}
                      position={center}
                      icon={renderScopeMarkerIcon(county.shortLabel, county.students, growthChoroplethColor(county.deltaRatio), 72, 'county')}
                      eventHandlers={{ click: () => onSelectCounty(county.id) }}
                    >
                      <Tooltip direction="top" offset={[0, -10]} className="atlas-map-tooltip atlas-map-tooltip--preview">
                        {renderHoverPreview(county.name, county.students, county.schools, county.delta, county.region)}
                      </Tooltip>
                    </Marker>
                  )
                })
              : null}

            {showTownshipMarkers
              ? <TownshipDotMarkers townshipRows={townshipRows} activeTownshipId={activeTownshipId} townshipCenterLookup={townshipCenterLookup} countyName={activeCounty?.name ?? ''} onSelectTownship={onSelectTownship} variant="full" />
              : null}

            {activeCounty && townshipRows.length > 0 && !showTownshipMarkers && !showSchoolMarkers
              ? <TownshipDotMarkers townshipRows={townshipRows} activeTownshipId={activeTownshipId} townshipCenterLookup={townshipCenterLookup} countyName={activeCounty.name} onSelectTownship={onSelectTownship} variant="compact" />
              : null}

            {showSchoolMarkers ? (
              <VisibleSchoolMarkers countyBuckets={countyBuckets} schoolPoints={schoolPoints} selectedSchoolId={selectedSchoolId} highlightedSchoolId={highlightedSchoolId} onSelectSchool={onSelectSchool} />
            ) : null}

            {activeCounty && townshipRows.length > 0 && !showSchoolMarkers ? (
              <AllTownshipLabels onSelectTownship={onSelectTownship} hiddenTownshipId={activeTownshipId} visibleTownshipIds={townshipRows.map((row) => row.id)} />
            ) : null}

            <MapBoundsController countyBoundaries={countyBoundaries} townshipBoundaries={townshipBoundaries} activeCountyId={activeCountyId} activeTownshipId={activeTownshipId} selectedSchoolPoint={selectedSchool} activeRegion={activeRegion} mapResetToken={mapResetToken} onZoomChange={onZoomChange} onMoveEnd={onMoveEnd} initialZoomFromUrl={initialMapZoom} initialLatFromUrl={initialMapLat} initialLonFromUrl={initialMapLon} />
          </MapContainer>
          <MapFloatingHelp activeTab={activeTab} activeCountyName={activeCounty?.name ?? null} />
        </div>
      </div>
    </section>
  )
}

export default TaiwanExplorerMap