import { useEffect, useMemo, useState } from 'react'

import type { Feature, GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { CircleMarker, GeoJSON, MapContainer, Marker, Popup, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet'

import type {
  AtlasLoadObservationSnapshot,
  CountyBucketDataset,
  CountyBoundaryCollection,
  CountyBoundaryProperties,
  SchoolBucketRecord,
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
  bucketBytes: number
  townshipBytes: number
  hasBucketSlice: boolean
  hasTownshipSlice: boolean
}

export type SchoolMapPoint = {
  id: string
  name: string
  townshipName: string
  educationLevel: string
  managementType: string
  status: string
  currentStudents: number
  delta: number
  latitude: number
  longitude: number
  website?: string
}

type TaiwanExplorerMapProps = {
  counties: CountySummary[]
  activeCountyId: string | null
  activeTownshipId: string | null
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  townshipRows: RankingSummary[]
  schoolPoints: SchoolMapPoint[]
  countyBuckets: CountyBucketDataset | null
  selectedSchoolId: string | null
  isTownshipBoundaryLoading: boolean
  onSelectCounty: (countyId: string) => void
  onSelectTownship: (townshipId: string) => void
  onSelectSchool: (schoolId: string) => void
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

function makeClusterIcon(count: number) {
  return L.divIcon({
    className: 'atlas-map-cluster-icon-wrap',
    html: `<span class="atlas-map-cluster-icon">${count}</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

function VisibleSchoolMarkers({
  schoolPoints,
  countyBuckets,
  selectedSchoolId,
  onSelectSchool,
}: {
  schoolPoints: SchoolMapPoint[]
  countyBuckets: CountyBucketDataset | null
  selectedSchoolId: string | null
  onSelectSchool: (schoolId: string) => void
}) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [bounds, setBounds] = useState(() => map.getBounds())

  useMapEvents({
    moveend: () => {
      setBounds(map.getBounds())
    },
    zoomend: () => {
      setZoom(map.getZoom())
      setBounds(map.getBounds())
    },
  })

  const bucketIndex = useMemo(
    () => ({
      5: countyBuckets?.precisions['5'] ?? [],
      6: countyBuckets?.precisions['6'] ?? [],
      7: countyBuckets?.precisions['7'] ?? [],
    }),
    [countyBuckets],
  )

  const visiblePoints = useMemo(
    () => schoolPoints.filter((point) => bounds.contains([point.latitude, point.longitude])),
    [bounds, schoolPoints],
  )

  const clusteredPoints = useMemo(() => {
    if (zoom >= 11) {
      return visiblePoints.map((point) => ({
        id: point.id,
        count: 1,
        latitude: point.latitude,
        longitude: point.longitude,
        schools: [point],
        schoolNames: [point.name],
        geohash: point.id,
      }))
    }

    const precision = zoom >= 10 ? 7 : zoom >= 9 ? 6 : 5
    const candidateBuckets = bucketIndex[precision as 5 | 6 | 7] as SchoolBucketRecord[]

    return candidateBuckets
      .filter((bucket) => {
        return !(
          bucket.bounds.maxLatitude < bounds.getSouth() ||
          bucket.bounds.minLatitude > bounds.getNorth() ||
          bucket.bounds.maxLongitude < bounds.getWest() ||
          bucket.bounds.minLongitude > bounds.getEast()
        )
      })
      .map((bucket) => ({
        id: bucket.id,
        count: bucket.count,
        latitude: bucket.latitude,
        longitude: bucket.longitude,
        schools: [] as SchoolMapPoint[],
        schoolNames: bucket.topSchools.map((school) => school.name),
        geohash: bucket.geohash,
      }))
  }, [bounds, bucketIndex, visiblePoints, zoom])

  return (
    <>
      {clusteredPoints.map((cluster) => {
        if (cluster.count === 1 && cluster.schools.length === 1) {
          const school = cluster.schools[0]
          const isSelected = school.id === selectedSchoolId
          return (
            <CircleMarker
              key={school.id}
              center={[school.latitude, school.longitude]}
              radius={isSelected ? 9 : Math.max(5, Math.min(10, Math.round(school.currentStudents / 150)))}
              pathOptions={{
                color: isSelected ? '#f8fafc' : '#0f172a',
                weight: isSelected ? 2 : 1,
                fillColor: school.status === '正常' ? '#38bdf8' : '#f59e0b',
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                click: () => onSelectSchool(school.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {school.name}
              </Tooltip>
              <Popup>
                <div className="atlas-map-popup">
                  <strong>{school.name}</strong>
                  <span>{school.townshipName}</span>
                  <span>{school.educationLevel} / {school.managementType}</span>
                  <span>{formatStudents(school.currentStudents)} 人</span>
                  <span>{formatDelta(school.delta)} 人</span>
                  {school.website ? (
                    <a href={school.website} target="_blank" rel="noreferrer">
                      查看學校資訊
                    </a>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          )
        }

        return (
          <Marker
            key={cluster.id}
            position={[cluster.latitude, cluster.longitude]}
            icon={makeClusterIcon(cluster.count)}
            eventHandlers={{
              click: () => {
                map.flyTo([cluster.latitude, cluster.longitude], Math.min(map.getZoom() + 2, 12), {
                  duration: 0.45,
                })
              },
            }}
          >
            <Popup>
              <div className="atlas-map-popup">
                <strong>{cluster.count} 所學校分群</strong>
                <span>目前視窗內已 lazy 載入</span>
                <span>bucket: {cluster.geohash}</span>
                <span>點擊分群可進一步放大檢視單校點位</span>
                <span>{cluster.schoolNames.slice(0, 3).join('、')}</span>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}

function TaiwanExplorerMap({
  counties,
  activeCountyId,
  activeTownshipId,
  countyBoundaries,
  townshipBoundaries,
  townshipRows,
  schoolPoints,
  countyBuckets,
  selectedSchoolId,
  isTownshipBoundaryLoading,
  onSelectCounty,
  onSelectTownship,
  onSelectSchool,
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
        <p className="panel-heading__meta">右側使用 Leaflet + CARTO 底圖，並在縣市模式下加入學校分群與視窗內 lazy marker 載入。</p>
      </div>

      <div className="map-toolbar">
        <div className="map-toolbar__mode">
          <span className="map-pill map-pill--active">{activeCounty ? '鄉鎮模式' : '縣市模式'}</span>
          {activeCounty ? <span className="map-pill">{activeCounty.name}</span> : <span className="map-pill">全台概覽</span>}
          {activeCounty ? <span className="map-pill">校點 {schoolPoints.length.toLocaleString('zh-TW')} 筆</span> : null}
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
            <span>{isTownshipBoundaryLoading ? '正在載入該縣市鄉鎮界線切片。' : '拖曳地圖時只會載入視窗範圍內的學校點位；縮放較遠時會自動分群。'}</span>
          </>
        ) : (
          <>
            <strong>探索提示</strong>
            <span>先以縣市模式掌握全台，再點入單一縣市檢視鄉鎮輪廓與學校群聚熱區。</span>
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

            {activeCounty && schoolPoints.length > 0 ? (
              <VisibleSchoolMarkers countyBuckets={countyBuckets} schoolPoints={schoolPoints} selectedSchoolId={selectedSchoolId} onSelectSchool={onSelectSchool} />
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

          <div className="atlas-map-sidecard atlas-map-sidecard--marker">
            <span className="map-stage__legend-title">校點模式</span>
            <span>低縮放：使用預先產製 bucket 分群</span>
            <span>高縮放：顯示單校點位</span>
            <span>目前選定：{selectedSchoolId ? '已鎖定單校' : '尚未選定'}</span>
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
                  <span>{county.hasBucketSlice ? `bucket ${formatFileSize(county.bucketBytes)}` : 'bucket 待載入'}</span>
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