import { useState, useRef, useEffect } from 'react'
import { SCHOOL_LEVEL_LEGEND } from '../schoolMarkerTheme'

type MapFloatingHelpProps = {
  activeTab: 'overview' | 'regional' | 'county' | 'schools' | 'school-focus'
  activeCountyName: string | null
}

const COUNTY_LEGEND = [
  { id: 0, color: '#99f6e4', opacity: 0.28, label: '< 5 萬人' },
  { id: 1, color: '#5eead4', opacity: 0.46, label: '5 萬 - 10 萬人' },
  { id: 2, color: '#14b8a6', opacity: 0.64, label: '10 萬 - 15 萬人' },
  { id: 3, color: '#0f766e', opacity: 0.82, label: '>= 15 萬人' },
]

function getTip(activeTab: MapFloatingHelpProps['activeTab'], activeCountyName: string | null) {
  if (activeTab === 'schools' || activeTab === 'school-focus') {
    return activeCountyName
      ? '點擊校點可查看詳細趨勢。'
      : '先選定縣市與鄉鎮，再用教育階段配色圓點檢視學校分布。'
  }

  if (activeTab === 'county') {
    return activeCountyName
      ? '檢視該縣市下的鄉鎮學生分布，點擊鄉鎮可進一步下鑽至校點層級。'
      : '先從全台選中縣市，隨即檢視縣內鄉鎮的學生規模差異。'
  }

  if (activeTab === 'regional') {
    return '掌握各區縣市規模，點選特定縣市可查看更詳細的行政區輪廓。'
  }

  return activeCountyName
    ? '目前已鎖定特定區域，您可以繼續點選圖面進行深層特徵探索。'
    : '先從全台區域開始，依序點選地區、縣市、鄉鎮與學校進行多層級下鑽。'
}

function MapFloatingHelp({ activeTab, activeCountyName }: MapFloatingHelpProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close guide when clicking anywhere on the screen
  useEffect(() => {
    if (!isOpen) return

    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // If clicking the toggle button itself, let its own handler (setIsOpen(!isOpen)) handle it.
      // For all other clicks (on the panel or anywhere else on the screen), close it.
      if (target.closest('.map-help-toggle')) {
        return
      }
      
      setIsOpen(false)
    }

    // Use capture phase to ensure we catch clicks even if other elements stop propagation (like the map)
    window.addEventListener('click', handleGlobalClick, true)

    return () => {
      window.removeEventListener('click', handleGlobalClick, true)
    }
  }, [isOpen])

  return (
    <div className="map-floating-tools" ref={containerRef}>
      <button
        type="button"
        className={isOpen ? 'map-help-toggle map-help-toggle--active' : 'map-help-toggle'}
        aria-expanded={isOpen}
        aria-controls="atlas-map-help"
        aria-label="切換探索提示與圖例"
        data-testid="map-help-toggle"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen((current) => !current)
        }}
      >
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          aria-hidden="true"
        >
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </svg>
      </button>

      {isOpen && (
        <section id="atlas-map-help" className="map-floating-help">
          <div className="map-floating-help__header">
            <span className="map-floating-help__title-badge">GUIDE</span>
            <h3 className="map-floating-help__title">地圖操作指引</h3>
          </div>
          
          <div className="map-floating-help__tip-body">
            <p className="map-floating-help__tip-text">{getTip(activeTab, activeCountyName)}</p>
          </div>

          <div className="map-floating-help__divider" />

          <div className="map-floating-help__legend-header">
            <h4 className="map-floating-help__legend-subtitle">數據圖例</h4>
          </div>

          <div className="map-floating-help__legend-grid">
            {activeTab === 'schools' || activeTab === 'school-focus' ? (
              <>
                <div className="map-floating-help__legend-items">
                  {SCHOOL_LEVEL_LEGEND.map((item) => (
                    <div key={item.label} className="map-stage__legend-row">
                      <span className="map-stage__legend-swatch map-stage__legend-swatch--dot" style={{ '--swatch-color': item.color } as React.CSSProperties} />
                      <span className="map-stage__legend-label">{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="map-floating-help__legend-footer">圓點反映各校位置，大小代表學生總量。</p>
              </>
            ) : (
              <>
                <div className="map-floating-help__legend-items">
                  {COUNTY_LEGEND.map((step) => (
                    <div key={step.id} className="map-stage__legend-row">
                      <span className="map-stage__legend-swatch" style={{ '--swatch-color': step.color, '--swatch-opacity': step.opacity } as React.CSSProperties} />
                      <span className="map-stage__legend-label">{step.label}</span>
                    </div>
                  ))}
                </div>
                <p className="map-floating-help__legend-footer">填色越深，代表目前區域學生人數越多。</p>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default MapFloatingHelp