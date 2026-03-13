import { useState } from 'react'

import { SCHOOL_LEVEL_LEGEND } from '../schoolMarkerTheme'

type MapFloatingHelpProps = {
  activeTab: 'overview' | 'regional' | 'county' | 'schools' | 'school-focus'
  activeCountyName: string | null
}

const COUNTY_LEGEND = [
  { id: 0, color: '#99f6e4', opacity: 0.28, label: '< 5 萬' },
  { id: 1, color: '#5eead4', opacity: 0.46, label: '5 萬 - 10 萬' },
  { id: 2, color: '#14b8a6', opacity: 0.64, label: '10 萬 - 15 萬' },
  { id: 3, color: '#0f766e', opacity: 0.82, label: '>= 15 萬' },
]

function getTip(activeTab: MapFloatingHelpProps['activeTab'], activeCountyName: string | null) {
  if (activeTab === 'schools' || activeTab === 'school-focus') {
    return activeCountyName
      ? '先看鄉鎮內校點與群聚，再點入單一學校同步切到右側學校分析；圓點顏色對應教育階段，大小反映目前層級聚合學生量。'
      : '先選定縣市與鄉鎮，再用教育階段配色圓點檢視學校分布與群聚熱區。'
  }

  if (activeTab === 'county') {
    return activeCountyName
      ? '先看目前縣市的鄉鎮分布，再點入單一鄉鎮進入各校分析；再次點選同一縣市即可回到區域層級。'
      : '先從區域挑出縣市，再進一步比較縣內鄉鎮學生規模與學校密度。'
  }

  if (activeTab === 'regional') {
    return '先以區域掌握縣市差異，再點入單一縣市檢視鄉鎮輪廓與區域熱區。'
  }

  return activeCountyName
    ? '目前已切進單一縣市，可從右側切到縣市分析或學校分析繼續下鑽。'
    : '先從全台區域總覽開始，再依序點選地區、縣市、鄉鎮與學校進行下鑽。'
}

function MapFloatingHelp({ activeTab, activeCountyName }: MapFloatingHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
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
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            aria-hidden="true"
          >
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
            <path d="M9 18h6" />
            <path d="M10 22h4" />
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
            {activeTab === 'schools' || activeTab === 'school-focus' ? (
              <>
                {SCHOOL_LEVEL_LEGEND.map((item) => (
                  <div key={item.label} className="map-stage__legend-row">
                    <span className="map-stage__legend-swatch map-stage__legend-swatch--dot" style={{ '--swatch-color': item.color } as React.CSSProperties} />
                    <span>{item.label}</span>
                  </div>
                ))}
                <p>圓點越大，代表目前視窗內該格網聚合的學生總量越高。</p>
              </>
            ) : (
              <>
                {COUNTY_LEGEND.map((step) => (
                  <div key={step.id} className="map-stage__legend-row">
                    <span className="map-stage__legend-swatch" style={{ '--swatch-color': step.color, '--swatch-opacity': step.opacity } as React.CSSProperties} />
                    <span>{step.label}</span>
                  </div>
                ))}
                <p>顏色越深，表示學生規模越高；切進區域與縣市後可逐層下鑽。</p>
              </>
            )}
          </div>
        </section>
      ) : null}
      </div>
    </>
  )
}

export default MapFloatingHelp