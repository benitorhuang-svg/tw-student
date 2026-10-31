import type { CSSProperties } from 'react'
import { growthChoroplethColor } from '@/shared/lib/analytics'
import { EDUCATION_LEGEND } from '@/shared/lib/education/educationTheme'
import { choroplethColor } from '../mapStyles'
import '../../styles/map/map-insight.css'

type MapLegendProps = {
  activeYear: number
  zoom: number
  hasSchools: boolean
  hasBaseline: boolean
  showAllLabels: boolean
  onToggleLabels: () => void
}

const growthItems = [
  { label: '增加', color: growthChoroplethColor(0.01) },
  { label: '持平 ±0.5%', color: growthChoroplethColor(0) },
  { label: '減少', color: growthChoroplethColor(-0.01) },
]

export function MapLegend({ activeYear, zoom, hasSchools, hasBaseline, showAllLabels, onToggleLabels }: MapLegendProps) {
  const schoolView = zoom >= 12 && hasSchools
  return (
    <section className="map-legend" aria-label="地圖圖例">
      <div className="map-legend__heading">
        <span>{schoolView ? '校點依學制' : hasBaseline ? `縣市年增減 · ${activeYear}／${activeYear - 1}` : '縣市年增減 · 無前年度資料'}</span>
        <button type="button" aria-pressed={showAllLabels} onClick={onToggleLabels}>
          {showAllLabels ? '精簡地名' : '完整地名'}
        </button>
      </div>
      <div className="map-legend__items">
        {(schoolView ? EDUCATION_LEGEND : hasBaseline ? growthItems : [{ label: '無比較資料', color: growthChoroplethColor(0) }]).map((item) => (
          <span className="map-legend__item" key={item.label}>
            <i aria-hidden="true" style={{ '--legend-color': item.color } as CSSProperties} />
            {item.label}
          </span>
        ))}
      </div>
      {zoom >= 10 && (
        <p className="map-legend__note">
          鄉鎮填色：學生總量
          <span className="map-legend__scale" aria-hidden="true">
            {[0, 10000, 50000, 100000, 150000].map((value) => <i key={value} style={{ '--legend-color': choroplethColor(value) } as CSSProperties} />)}
          </span>
          少 → 多
        </p>
      )}
      {schoolView && <p className="map-legend__note">校點大小代表學生人數；縣市標籤仍表示年增減。</p>}
      <span className="sr-only">縣市年增減：增加為藍色，減少為粉紅色，正負百分之零點五以內為灰色。放大地圖可顯示更多地名。</span>
    </section>
  )
}
