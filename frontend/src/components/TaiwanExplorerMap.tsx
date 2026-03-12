import { useState } from 'react'
import type { Feature, GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, ZoomControl } from 'react-leaflet'
import type {
  CountyBucketDataset,
  CountyBoundaryCollection,
  CountyBoundaryProperties,
  
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
  LIGHT_TILE_URL,
  growthChoroplethColor,
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
  counties: CountySummary[]
  activeRegion: '全部' | '北部' | '中部' | '南部' | '東部' | '離島'
  activeCountyId: string | null
  activeTownshipId: string | null
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
  onAutoSelectCounty?: (countyId: string) => void
  onSelectTownship: (townshipId: string) => void
  onSelectSchool: (schoolId: string | null) => void
  onHoverCounty?: (countyId: string | null) => void
  onZoomChange?: (zoom: number) => void; onMoveEnd?: (lat: number, lon: number) => void
  currentMapZoom?: number | null
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
}: TaiwanExplorerMapProps) {
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(
    initialMapLat != null && initialMapLon != null ? [initialMapLat, initialMapLon] : null,
  )
  const tileUrl = theme === 'dark' ? DARK_TILE_URL : LIGHT_TILE_URL
  const tileOpacity = theme === 'dark' ? 0.32 : 1
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
    currentMapZoom,
    mapCenter,
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
            center={[initialMapLat ?? 24.4444, initialMapLon ?? 120.2500]}
            zoom={initialMapZoom ?? 7}
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
                    color: theme === 'dark' ? '#334155' : '#94a3b8',
                    weight: 1,
                    fillColor: theme === 'dark' ? '#0f172a' : '#f8fafc',
                    fillOpacity: theme === 'dark' ? 0.12 : 0.6,
                  }
                }

                return {
                  color: isActive || isHovered ? (theme === 'dark' ? '#e2e8f0' : '#ffffff') : (theme === 'dark' ? 'rgba(126, 168, 137, 0.42)' : '#94a3b8'),
                  weight: isActive ? 2.2 : isHovered ? 1.8 : 1.1,
                  fillColor: isActive ? '#b8d7be' : choroplethColor(summary.students),
                  fillOpacity: activeCountyId && !isActive ? 0.1 : choroplethOpacity(summary.students),
                }
              }}
              onEachFeature={(feature: Feature, layer: L.Layer) => {
                const properties = feature.properties as CountyBoundaryProperties
                const summary = countyLookup.get(properties.countyId) ?? null
                if (summary && !showCountyMarkers) {
                  layer.bindTooltip(buildHoverPreviewHtml(summary.name), previewTipOpts)
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
                    color: isActive || isHovered ? (theme === 'dark' ? '#f8fafc' : '#ffffff') : (theme === 'dark' ? 'rgba(124, 158, 133, 0.38)' : 'rgba(100, 116, 139, 0.35)'),
                    weight: isActive ? 2.1 : isHovered ? 1.7 : 1,
                    fillColor: isActive ? '#cfe6d3' : choroplethColor(summary?.students ?? 0),
                    fillOpacity: summary ? Math.max(0.07, choroplethOpacity(summary.students) - 0.04) : 0.08,
                  }
                }}
                onEachFeature={(feature: Feature, layer: L.Layer) => {
                  const properties = feature.properties as TownshipBoundaryProperties
                  const summary = townshipLookup.get(properties.townId) ?? null
                  if (summary && !showTownshipMarkers) {
                    layer.bindTooltip(buildHoverPreviewHtml(summary.label), previewTipOpts)
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
              ? (() => {
                  const filteredCounties = counties.filter((c) => (currentMapZoom != null && currentMapZoom >= 8 ? true : c.shortLabel !== '嘉市'))
                  return filteredCounties.map((county) => {
                    const isChiayi = county.shortLabel === '嘉縣'
                    const showSeparateChiayi = currentMapZoom === 8
                    const displayLabel = county.shortLabel
                    let displayStudents = county.students
                    let displayDelta = county.delta
                    let displayDeltaRatio = county.deltaRatio

                    if (isChiayi && !showSeparateChiayi) {
                      const chiayiCity = counties.find((c) => c.shortLabel === '嘉市')
                      if (chiayiCity) {
                        displayStudents += chiayiCity.students
                        displayDelta += chiayiCity.delta
                        const oldRaw = county.students - county.delta + (chiayiCity.students - chiayiCity.delta)
                        displayDeltaRatio = oldRaw > 0 ? displayDelta / oldRaw : 0
                      }
                    }

                    // Use the original center for Chiayi County, or slightly adjust it? Original is fine.
                    const center = countyCenterLookup.get(county.id)
                    if (!center) return null


                    // Small manual visual offsets for specific counties to avoid overlap.
                    // Provide zoom-specific adjustments for visual comfort and interpolate
                    // between zoom levels to avoid abrupt jumps while the user zooms.
                      // keep 嘉市 offset stable across zooms so it remains readable when zooming in
                      const globalPositionOffsets: Record<string, [number, number]> = {
                        '嘉市': [0, -0.02],
                          '新北市': [0, -0.03],
                          '基隆市': [0.02, 0],
                          '臺北市': [-0.02, 0.02],
                          '嘉縣': [0.05, 0.12],
                    }

                    const zoomSpecificOffsets: Record<number, Record<string, [number, number]>> = {
                      7: {
                        '新北': [-0.06, -0.02],
                        '基隆': [0, 0.06],
                        '臺北': [0.06, -0.06],
                        '台北': [0.06, -0.06],
                        '嘉縣': [0.05, 0.12 ],
                      },
                      8: {
                        // At zoom 8 show 嘉市 and 嘉縣 separately; push 嘉縣 to right to avoid overlap
                        // 嘉市 shown separately starting zoom 8 and keep same offset for higher zooms
                        '嘉市': [0, -0.02],
                        '嘉縣': [0.05, 0.12 ],
                      },
                      9: {
                        // Zoom=9: 增加新北往左下的偏移量，使標記落在較空曠位置
                        '新北': [-0.1, -0.1], // stronger left-down
                        '基隆': [0, -0.02],     // left
                        '臺北': [0.02, -0.02],  // left-up
                        '台北': [0.02, -0.02],
                        // keep 嘉市 offset at higher zooms
                         '嘉縣': [0.05, 0.12 ],
                         '嘉市': [0, -0.02],
                      },
                      11: {
                        '新北': [-0.1, -0.1],
                        '基隆': [0, -0.01],
                        '臺北': [0.01, -0.01],
                        '台北': [0.01, -0.01],
                        '嘉縣': [0.05, 0.12],
                        '嘉市': [0, -0.02],
                      },
                    }

                    function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

                    function getInterpolatedOffsetsForZoom(zoom: number | null) {
                      if (zoom == null) return globalPositionOffsets
                      const keys = Object.keys(zoomSpecificOffsets).map(Number).sort((a, b) => a - b)
                      if (keys.length === 0) return globalPositionOffsets
                      if (zoom <= keys[0]) return zoomSpecificOffsets[keys[0]]
                      if (zoom >= keys[keys.length - 1]) return zoomSpecificOffsets[keys[keys.length - 1]]

                      let lower = keys[0]
                      let upper = keys[keys.length - 1]
                      for (let i = 0; i < keys.length - 1; i++) {
                        if (zoom >= keys[i] && zoom <= keys[i + 1]) {
                          lower = keys[i]
                          upper = keys[i + 1]
                          break
                        }
                      }

                      const t = (zoom - lower) / (upper - lower)
                      const lowerOffsets = zoomSpecificOffsets[lower]
                      const upperOffsets = zoomSpecificOffsets[upper]
                      const result: Record<string, [number, number]> = {}

                      const allKeys = new Set<string>([...Object.keys(lowerOffsets), ...Object.keys(upperOffsets)])
                      allKeys.forEach((k) => {
                        const lo = lowerOffsets[k] ?? globalPositionOffsets[k] ?? [0, 0]
                        const hi = upperOffsets[k] ?? globalPositionOffsets[k] ?? [0, 0]
                        result[k] = [lerp(lo[0], hi[0], t), lerp(lo[1], hi[1], t)]
                      })

                      return result
                    }

                    const effectiveOffsets = getInterpolatedOffsetsForZoom(currentMapZoom ?? null)
                    const offset = effectiveOffsets[county.shortLabel] ?? null
                    const adjustedCenter: [number, number] = offset ? [center[0] + offset[0], center[1] + offset[1]] : center

                    return (
                      <Marker
                        key={`county-marker-${county.id}`}
                        position={adjustedCenter}
                        icon={renderScopeMarkerIcon(displayLabel, displayStudents, growthChoroplethColor(displayDeltaRatio), 54, 'county')}
                        eventHandlers={{ click: () => onSelectCounty(county.id) }}
                      >
                        <Tooltip direction="top" offset={[0, -10]} className="atlas-map-tooltip atlas-map-tooltip--preview">
                          {renderHoverPreview(isChiayi ? '嘉義' : county.name)}
                        </Tooltip>
                      </Marker>
                    )
                  })
                })()
              : null}

            

            {showTownshipMarkers
              ? <TownshipDotMarkers townshipRows={townshipRows} activeTownshipId={activeTownshipId} townshipCenterLookup={townshipCenterLookup} onSelectTownship={onSelectTownship} variant="full" />
              : null}

            {showSchoolMarkers ? (
              (() => {
                // When zoom >= 12 and a township is selected, only show schools inside that township.
                const zoom = currentMapZoom ?? 7
                let schoolPointsToShow = schoolPoints
                if (zoom >= 12 && activeTownshipId) {
                  const activeTown = townshipRows.find((t) => t.id === activeTownshipId)
                  const activeLabel = activeTown?.label ?? null
                  if (activeLabel) {
                    schoolPointsToShow = schoolPoints.filter((p) => p.townshipName === activeLabel)
                  }
                }

                return <VisibleSchoolMarkers countyBuckets={countyBuckets} schoolPoints={schoolPointsToShow} selectedSchoolId={selectedSchoolId} highlightedSchoolId={highlightedSchoolId} onSelectSchool={onSelectSchool} />
              })()
            ) : null}

            {activeCounty && townshipRows.length > 0 && !showSchoolMarkers ? (
              <AllTownshipLabels onSelectTownship={onSelectTownship} hiddenTownshipId={activeTownshipId} visibleTownshipIds={townshipRows.map((row) => row.id)} />
            ) : null}

            <MapBoundsController
              countyBoundaries={countyBoundaries}
              townshipBoundaries={townshipBoundaries}
              activeCountyId={activeCountyId}
              activeTownshipId={activeTownshipId}
              selectedSchoolPoint={selectedSchool}
              activeRegion={activeRegion}
              mapResetToken={mapResetToken}
              onZoomChange={onZoomChange}
              onMoveEnd={(lat, lon) => {
                setMapCenter([lat, lon])
                onMoveEnd?.(lat, lon)
              }}
              onAutoSelectCounty={onAutoSelectCounty ?? onSelectCounty}
              initialZoomFromUrl={initialMapZoom}
              initialLatFromUrl={initialMapLat}
              initialLonFromUrl={initialMapLon}
            />
          </MapContainer>
          <MapFloatingHelp activeTab={activeTab} activeCountyName={activeCounty?.name ?? null} />
        </div>
      </div>
    </section>
  )
}

export default TaiwanExplorerMap