import { useState } from 'react'

import { SCHOOL_LEVEL_LEGEND } from './schoolMarkerTheme'

type MapFloatingHelpProps = {
  activeTab: 'overview' | 'regional' | 'schools'
  activeCountyName: string | null
}

const COUNTY_LEGEND = [
  { id: 0, color: '#99f6e4', opacity: 0.28, label: '< 5 萬' },
  { id: 1, color: '#5eead4', opacity: 0.46, label: '5 萬 - 10 萬' },
  { id: 2, color: '#14b8a6', opacity: 0.64, label: '10 萬 - 15 萬' },
  { id: 3, color: '#0f766e', opacity: 0.82, label: '>= 15 萬' },
]

function getTip(activeTab: MapFloatingHelpProps['activeTab'], activeCountyName: string | null) {
  if (activeTab === 'schools') {
    return activeCountyName
      ? '先看縣內圓點分布，再放大聚焦單一學校；圓點顏色對應教育階段，圓點大小反映同一地理格網內的學校數量。'
      : '先選定縣市，再用教育階段配色圓點檢視學校分布與群聚熱區。'
  }

  if (activeTab === 'regional') {
    return activeCountyName
      ? '先看目前縣市的鄉鎮輪廓，再點入單一鄉鎮比對區域差異。'
      : '先以縣市模式掌握全台，再點入單一縣市檢視鄉鎮輪廓與區域熱區。'
  }

  return activeCountyName
    ? '目前已切進單一縣市，可從左欄切到區域分析或學校工作台繼續下鑽。'
    : '先以縣市模式掌握全台，再點入單一縣市檢視鄉鎮輪廓與學校群聚熱區。'
}

function MapFloatingHelp({ activeTab, activeCountyName }: MapFloatingHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="map-floating-tools">
      <button
        type="button"
        className={isOpen ? 'map-help-toggle map-help-toggle--active' : 'map-help-toggle'}
        aria-expanded={isOpen}
        aria-controls="atlas-map-help"
        aria-label="切換探索提示與圖例"
        data-testid="map-help-toggle"
        onClick={() => setIsOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 21h6m-5-3h4m-6.2-2.8c-1.6-1.2-2.8-3.1-2.8-5.2a7 7 0 1 1 14 0c0 2.1-1.2 4-2.8 5.2-.6.4-1.2 1.1-1.2 1.8V17H9v-.2c0-.7-.6-1.4-1.2-1.8Z" />
        </svg>
      </button>

      {isOpen ? (
        <section id="atlas-map-help" className="map-floating-help">
          <div className="map-floating-help__section">
            <span className="map-stage__legend-title">探索提示</span>
            <p>{getTip(activeTab, activeCountyName)}</p>
          </div>

          <div className="map-floating-help__section">
            <span className="map-stage__legend-title">圖例說明</span>
            {activeTab === 'schools' ? (
              <>
                {SCHOOL_LEVEL_LEGEND.map((item) => (
                  <div key={item.label} className="map-stage__legend-row">
                    <span className="map-stage__legend-swatch map-stage__legend-swatch--dot" style={{ background: item.color, opacity: 1 }} />
                    <span>{item.label}</span>
                  </div>
                ))}
                <p>圓點越大，代表目前視窗內該格網聚合的學校越多。</p>
              </>
            ) : (
              <>
                {COUNTY_LEGEND.map((step) => (
                  <div key={step.id} className="map-stage__legend-row">
                    <span className="map-stage__legend-swatch" style={{ background: step.color, opacity: step.opacity }} />
                    <span>{step.label}</span>
                  </div>
                ))}
                <p>顏色越深，表示學生規模越高；切進縣市後可再下鑽鄉鎮輪廓。</p>
              </>
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default MapFloatingHelp