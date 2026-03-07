import { useEffect, useState } from 'react'

import type { Feature, GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { GeoJSON, MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet'

import type {
  AtlasLoadObservationSnapshot,
  CountyBoundaryCollection,
  CountyBoundaryProperties,
  TownshipBoundaryCollection,
  TownshipBoundaryProperties,
} from '../data/educationData'
import {
  formatDelta,
  formatFileSize,
  formatPercent,
  formatStudents,
  type CountySummary,
  type RankingSummary,
} from '../lib/analytics'

type ObservedCountyResource = {
  id: string
  name: string
  detailBytes: number
  townshipBytes: number
  hasTownshipSlice: boolean
}

type TaiwanExplorerMapProps = {
  counties: CountySummary[]
  activeCountyId: string | null
  activeTownshipId: string | null
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  townshipRows: RankingSummary[]
  isTownshipBoundaryLoading: boolean
  onSelectCounty: (countyId: string) => void
  onSelectTownship: (townshipId: string) => void
  onResetScope: () => void
  onHoverCounty?: (countyId: string | null) => void
  loadObservation: AtlasLoadObservationSnapshot
  observedCounties: ObservedCountyResource[]
}

function MapBoundsController({
  countyBoundaries,
  townshipBoundaries,
  activeCountyId,
}: {
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  activeCountyId: string | null
}) {
  const map = useMap()

  useEffect(() => {
    const boundsSource = townshipBoundaries
      ? townshipBoundaries
      : activeCountyId
        ? {
            type: 'FeatureCollection' as const,
            features: countyBoundaries.features.filter((feature) => feature.properties.countyId === activeCountyId),
          }
        : countyBoundaries

    const bounds = L.geoJSON(boundsSource as GeoJsonObject).getBounds()
    if (bounds.isValid()) {
      map.flyToBounds(bounds, {
        padding: [22, 22],
        duration: 0.7,
        maxZoom: townshipBoundaries ? 11 : activeCountyId ? 9 : 8,
      })
    }
  }, [activeCountyId, countyBoundaries, map, townshipBoundaries])

  return null
}

function TaiwanExplorerMap({
  counties,
  activeCountyId,
  activeTownshipId,
  countyBoundaries,
  townshipBoundaries,
  townshipRows,
  isTownshipBoundaryLoading,
  onSelectCounty,
  onSelectTownship,
  onResetScope,
  onHoverCounty,
  loadObservation,
  observedCounties,
}: TaiwanExplorerMapProps) {
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null)
  const activeCounty = counties.find((county) => county.id === activeCountyId) ?? null
  const countyLookup = new Map(counties.map((county) => [county.id, county]))
  const townshipLookup = new Map(townshipRows.map((township) => [township.id, township]))
  const maxCountyStudents = Math.max(...counties.filter((county) => !county.filteredOut).map((county) => county.students), 1)
  const maxTownshipStudents = Math.max(...townshipRows.map((township) => township.students), 1)
  const legendSteps = [
    { id: 0, opacity: 0.18, label: '少於 5 萬' },
    { id: 1, opacity: 0.36, label: '5 萬到 10 萬' },
    { id: 2, opacity: 0.58, label: '10 萬到 15 萬' },
    { id: 3, opacity: 0.8, label: '15 萬以上' },
  ]

  const hoveredSummary = activeCounty
    ? (hoveredFeatureId ? townshipLookup.get(hoveredFeatureId) ?? null : null)
    : hoveredFeatureId
      ? countyLookup.get(hoveredFeatureId) ?? null
      : null

  return (
    <section className="panel atlas-map-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Leaflet 地圖</p>
          <h3>{activeCounty ? `${activeCounty.name} 鄉鎮輪廓圖` : '全台縣市輪廓圖'}</h3>
        </div>
        <p className="panel-heading__meta">右側使用 Leaflet + CARTO 底圖，保留 hover 預抓、點擊下鑽與正式資料觀測。</p>
      </div>

      <div className="map-toolbar">
        <div className="map-toolbar__mode">
          <span className="map-pill map-pill--active">{activeCounty ? '鄉鎮模式' : '縣市模式'}</span>
          {activeCounty ? <span className="map-pill">{activeCounty.name}</span> : <span className="map-pill">全台概覽</span>}
        </div>
        {activeCounty ? (
          <button type="button" className="ghost-button" onClick={onResetScope}>
            回到全台縣市
          </button>
        ) : null}
      </div>

      <div className="map-hero-note">
        {hoveredSummary ? (
          <>
            <strong>{'name' in hoveredSummary ? hoveredSummary.name : hoveredSummary.label}</strong>
            <span>{formatStudents(hoveredSummary.students)} 人</span>
            <span>
              {formatDelta(hoveredSummary.delta)} 人 / {formatPercent(hoveredSummary.deltaRatio)}
            </span>
          </>
        ) : activeCounty ? (
          <>
            <strong>{activeCounty.name}</strong>
            <span>{isTownshipBoundaryLoading ? '正在載入該縣市鄉鎮界線切片。' : '可拖曳地圖並點擊鄉鎮，左側表格會同步聚焦。'}</span>
          </>
        ) : (
          <>
            <strong>探索提示</strong>
            <span>先以縣市模式掌握全台，再點入單一縣市檢視鄉鎮輪廓與異常訊號。</span>
          </>
        )}
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
                  fillColor: isActive ? '#38bdf8' : '#22c55e',
                  fillOpacity: activeCountyId && !isActive ? 0.09 : Math.max(summary.students / maxCountyStudents, 0.18),
                }
              }}
              eventHandlers={{}}
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

            <MapBoundsController countyBoundaries={countyBoundaries} townshipBoundaries={townshipBoundaries} activeCountyId={activeCountyId} />
          </MapContainer>
        </div>

        <div className="atlas-map-sidebar">
          <div className="atlas-map-sidecard">
            <span className="map-stage__legend-title">地圖圖例</span>
            {legendSteps.map((step) => (
              <div key={step.id} className="map-stage__legend-row">
                <span className="map-stage__legend-swatch" style={{ background: `rgba(16, 185, 129, ${step.opacity})` }} />
                <span>{step.label}</span>
              </div>
            ))}
          </div>

          <div className="atlas-map-sidecard" data-testid="map-observability">
            <span className="map-stage__legend-title">載入來源觀測</span>
            <span>快取命中 {loadObservation.cacheHits} 次</span>
            <span>本地 DB {loadObservation.indexedDbHits} 次 / 記憶體 {loadObservation.memoryHits} 次</span>
            <span>累積傳輸 {formatFileSize(loadObservation.totalTransferredBytes)}</span>
            <div className="map-stage__observability-items">
              {observedCounties.length === 0 ? <span>尚未載入縣市切片</span> : null}
              {observedCounties.map((county) => (
                <div key={county.id} className="map-stage__observability-chip">
                  <strong>{county.name}</strong>
                  <span>細節 {formatFileSize(county.detailBytes)}</span>
                  <span>{county.hasTownshipSlice ? `鄉鎮 ${formatFileSize(county.townshipBytes)}` : '鄉鎮待載入'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="atlas-map-sidecard atlas-map-sidecard--source">
            <span className="map-stage__legend-title">圖資來源</span>
            <span>© OpenStreetMap contributors</span>
            <span>© CARTO</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TaiwanExplorerMap