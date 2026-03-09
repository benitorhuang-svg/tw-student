import type { AtlasLoadObservationSnapshot } from '../../data/educationData'
import { formatFileSize, type CountySummary } from '../../lib/analytics'
import type { ObservedCountyResource, SchoolMapPoint } from './types'

type MapSidebarProps = {
  activeTab: 'overview' | 'regional' | 'schools' | 'school-focus'
  activeCounty: CountySummary | null
  selectedSchool: SchoolMapPoint | null
  loadObservation: AtlasLoadObservationSnapshot
  observedCounties: ObservedCountyResource[]
  townshipCount: number
  schoolCount: number
}

const legendSteps = [
  { id: 0, color: '#99f6e4', opacity: 0.28, label: '< 5 萬' },
  { id: 1, color: '#5eead4', opacity: 0.46, label: '5 萬 – 10 萬' },
  { id: 2, color: '#14b8a6', opacity: 0.64, label: '10 萬 – 15 萬' },
  { id: 3, color: '#0f766e', opacity: 0.82, label: '≥ 15 萬' },
]

function MapSidebar({
  activeTab,
  activeCounty,
  selectedSchool,
  loadObservation,
  observedCounties,
  townshipCount,
  schoolCount,
}: MapSidebarProps) {
  return (
    <div className="atlas-map-sidebar">
      {activeTab === 'regional' ? (
        <div className="atlas-map-sidecard atlas-map-sidecard--marker">
          <span className="map-stage__legend-title">區域下鑽</span>
          <span>{activeCounty ? `目前縣市：${activeCounty.name}` : '先點選縣市，進入鄉鎮層級。'}</span>
          <span>{activeCounty ? `鄉鎮筆數：${townshipCount.toLocaleString('zh-TW')}` : '區域分析頁不顯示學校校點分群。'}</span>
        </div>
      ) : null}

      {(activeTab === 'overview' || activeTab === 'regional') ? (
        <div className="atlas-map-sidecard">
          <span className="map-stage__legend-title">地圖圖例</span>
          {legendSteps.map((step) => (
            <div key={step.id} className="map-stage__legend-row">
              <span className="map-stage__legend-swatch" style={{ background: step.color, opacity: step.opacity }} />
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {activeTab === 'schools' || activeTab === 'school-focus' ? (
        <div className="atlas-map-sidecard atlas-map-sidecard--marker" data-testid="map-school-card">
          <span className="map-stage__legend-title">學校定位</span>
          <span>低縮放：使用預先產製 bucket 分群</span>
          <span>高縮放：顯示單校點位</span>
          <span>目前縣市：{activeCounty ? activeCounty.name : '尚未選定'}</span>
          <span>校點筆數：{schoolCount.toLocaleString('zh-TW')}</span>
          <span>目前單校：{selectedSchool ? selectedSchool.name : '尚未選定'}</span>
        </div>
      ) : null}

      {(activeTab === 'overview' || activeTab === 'regional') ? (
        <div className="atlas-map-sidecard" data-testid="map-observability">
          <span className="map-stage__legend-title">載入來源觀測</span>
          <span>快取命中 {loadObservation.cacheHits} 次</span>
          <span>SQLite {loadObservation.sqliteHits} 次 / 記憶體 {loadObservation.memoryHits} 次</span>
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
      ) : null}

      <div className="atlas-map-sidecard atlas-map-sidecard--source">
        <span className="map-stage__legend-title">資料與圖資來源</span>
        <span>© OpenStreetMap contributors</span>
        <span>© CARTO</span>
        <span>教育部統計處校別統計 / 教育 GIS / 內政部行政區界線</span>
      </div>
    </div>
  )
}

export default MapSidebar