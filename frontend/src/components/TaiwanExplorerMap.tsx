import { useState } from 'react'

import type { Feature, GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { GeoJSON, MapContainer, TileLayer, ZoomControl } from 'react-leaflet'

import type {
  CountyBucketDataset,
  CountyBoundaryCollection,
  CountyBoundaryProperties,
  TownshipBoundaryCollection,
  TownshipBoundaryProperties,
} from '../data/educationData'
import { type CountySummary, type RankingSummary } from '../lib/analytics'
import MapBoundsController from './map/MapBoundsController'
import MapFloatingHelp from './map/MapFloatingHelp'
import VisibleSchoolMarkers from './map/VisibleSchoolMarkers'
import type { SchoolMapPoint } from './map/types'

export type { SchoolMapPoint } from './map/types'

type TaiwanExplorerMapProps = {
  counties: CountySummary[]
  activeCountyId: string | null
  activeTownshipId: string | null
  activeTab: 'overview' | 'regional' | 'schools'
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  townshipRows: RankingSummary[]
  schoolPoints: SchoolMapPoint[]
  countyBuckets: CountyBucketDataset | null
  selectedSchoolId: string | null
  isTownshipBoundaryLoading: boolean
  mapResetToken: number
  onSelectCounty: (countyId: string) => void
  onSelectTownship: (townshipId: string) => void
  onSelectSchool: (schoolId: string) => void
  onResetScope: () => void
  onHoverCounty?: (countyId: string | null) => void
}

function TaiwanExplorerMap({
  counties,
  activeCountyId,
  activeTownshipId,
  activeTab,
  countyBoundaries,
  townshipBoundaries,
  townshipRows,
  schoolPoints,
  countyBuckets,
  selectedSchoolId,
  isTownshipBoundaryLoading,
  mapResetToken,
  onSelectCounty,
  onSelectTownship,
  onSelectSchool,
  onResetScope,
  onHoverCounty,
}: TaiwanExplorerMapProps) {
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null)
  const activeCounty = counties.find((county) => county.id === activeCountyId) ?? null
  const countyLookup = new Map(counties.map((county) => [county.id, county]))
  const townshipLookup = new Map(townshipRows.map((township) => [township.id, township]))
  const maxTownshipStudents = Math.max(...townshipRows.map((township) => township.students), 1)
  const choroplethColor = (students: number) => {
    if (students >= 150000) return '#0f766e'
    if (students >= 100000) return '#14b8a6'
    if (students >= 50000) return '#5eead4'
    return '#99f6e4'
  }

  const choroplethOpacity = (students: number) => {
    if (students >= 150000) return 0.82
    if (students >= 100000) return 0.64
    if (students >= 50000) return 0.46
    return 0.28
  }

  const hoveredSummary = activeCounty
    ? (hoveredFeatureId ? townshipLookup.get(hoveredFeatureId) ?? null : null)
    : hoveredFeatureId
      ? countyLookup.get(hoveredFeatureId) ?? null
      : null
  const showSchoolMarkers = activeTab === 'schools' && Boolean(activeCounty) && schoolPoints.length > 0
  const modeLabel = activeCounty ? (activeTab === 'schools' ? '校點模式' : '鄉鎮模式') : '縣市模式'

  return (
    <section className="panel atlas-map-panel">
      <div className="map-toolbar">
        <div className="map-toolbar__mode">
          <span className="map-pill map-pill--active">{modeLabel}</span>
          {activeCounty ? <span className="map-pill">{activeCounty.name}</span> : <span className="map-pill">全台概覽</span>}
          {activeCounty && activeTab === 'regional' ? <span className="map-pill">鄉鎮 {townshipRows.length.toLocaleString('zh-TW')} 筆</span> : null}
          {activeCounty && activeTab === 'schools' ? <span className="map-pill">校點 {schoolPoints.length.toLocaleString('zh-TW')} 筆</span> : null}
          {hoveredSummary ? <span className="map-pill">{'name' in hoveredSummary ? hoveredSummary.name : hoveredSummary.label}</span> : null}
        </div>
        {activeCounty ? (
          <button type="button" className="ghost-button" onClick={onResetScope}>
            回到全台縣市
          </button>
        ) : null}
      </div>

      <div className="atlas-map-shell">
        <div className="atlas-map-canvas-wrap">
          {isTownshipBoundaryLoading ? <div className="atlas-map-loading">正在同步縣市鄉鎮界線…</div> : null}
          <MapContainer
            center={[23.7, 121]}
            zoom={7.4}
            minZoom={7}
            maxZoom={12}
            zoomControl={false}
            className="atlas-map-canvas"
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution="© OpenStreetMap contributors © CARTO"
            />
            <ZoomControl position="topright" />

            <GeoJSON
              data={countyBoundaries as GeoJsonObject}
              style={(feature: Feature | undefined) => {
                const properties = feature?.properties as CountyBoundaryProperties | undefined
                const countyId = properties?.countyId ?? ''
                const summary = countyLookup.get(countyId) ?? null
                const isActive = countyId === activeCountyId
                const isHovered = countyId === hoveredFeatureId

                if (!summary || summary.filteredOut) {
                  return {
                    color: '#334155',
                    weight: 1,
                    fillColor: '#0f172a',
                    fillOpacity: 0.12,
                  }
                }

                return {
                  color: isActive || isHovered ? '#e2e8f0' : 'rgba(191, 219, 254, 0.38)',
                  weight: isActive ? 2.2 : isHovered ? 1.8 : 1.1,
                  fillColor: isActive ? '#38bdf8' : choroplethColor(summary.students),
                  fillOpacity: activeCountyId && !isActive ? 0.12 : choroplethOpacity(summary.students),
                }
              }}
              onEachFeature={(feature: Feature, layer: L.Layer) => {
                const properties = feature.properties as CountyBoundaryProperties
                const summary = countyLookup.get(properties.countyId) ?? null

                layer.bindTooltip(properties.shortLabel, {
                  permanent: !activeCounty,
                  direction: 'center',
                  className: 'atlas-map-tooltip atlas-map-tooltip--label',
                  opacity: activeCounty ? 0 : 1,
                })

                layer.on({
                  click: () => {
                    if (summary && !summary.filteredOut) {
                      onSelectCounty(properties.countyId)
                    }
                  },
                  mouseover: () => {
                    setHoveredFeatureId(properties.countyId)
                    onHoverCounty?.(properties.countyId)
                  },
                  mouseout: () => {
                    setHoveredFeatureId(null)
                    onHoverCounty?.(null)
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
                  const isHovered = townshipId === hoveredFeatureId

                  return {
                    color: isActive || isHovered ? '#f8fafc' : 'rgba(226, 232, 240, 0.44)',
                    weight: isActive ? 2.1 : isHovered ? 1.7 : 1,
                    fillColor: isActive ? '#0ea5e9' : '#10b981',
                    fillOpacity: summary ? Math.max(summary.students / maxTownshipStudents, 0.14) : 0.08,
                  }
                }}
                onEachFeature={(feature: Feature, layer: L.Layer) => {
                  const properties = feature.properties as TownshipBoundaryProperties

                  layer.on({
                    click: () => onSelectTownship(properties.townId),
                    mouseover: () => setHoveredFeatureId(properties.townId),
                    mouseout: () => setHoveredFeatureId(null),
                  })
                }}
              />
            ) : null}

            {showSchoolMarkers ? (
              <VisibleSchoolMarkers countyBuckets={countyBuckets} schoolPoints={schoolPoints} selectedSchoolId={selectedSchoolId} onSelectSchool={onSelectSchool} />
            ) : null}

            <MapBoundsController countyBoundaries={countyBoundaries} townshipBoundaries={townshipBoundaries} activeCountyId={activeCountyId} mapResetToken={mapResetToken} />
          </MapContainer>
          <MapFloatingHelp activeTab={activeTab} activeCountyName={activeCounty?.name ?? null} />
        </div>
      </div>
    </section>
  )
}

export default TaiwanExplorerMap