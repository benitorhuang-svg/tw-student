import { useState } from 'react'
import type { MapScopeSnapshot } from '../mapScopeSnapshot'

import { MapYearStepper } from '../atoms/MapYearStepper'
import { MapSchoolRankingPanel } from '../molecules/MapSchoolRankingPanel'
import { MapTrendCard } from '../molecules/MapTrendCard'
import type { MapCanvasProps } from './MapCanvas.types'
import '../../styles/map/mobile-dock.css'

type MobilePanel = 'students' | 'growth' | 'decline' | 'trend'

type MapMobileBottomDockProps = {
  props: MapCanvasProps
  defaultActivePanel: 'students' | 'trend'
  defaultShowOverlay: boolean
  snapshot: MapScopeSnapshot
}

const modes: Array<{ value: MobilePanel; label: string }> = [
  { value: 'students', label: '學生人數' },
  { value: 'growth', label: '增加率' },
  { value: 'decline', label: '減少率' },
  { value: 'trend', label: '歷史趨勢' },
]

export function MapMobileBottomDock({ props, defaultActivePanel, defaultShowOverlay, snapshot }: MapMobileBottomDockProps) {
  const [activePanel, setActivePanel] = useState<MobilePanel>(defaultActivePanel)
  const [showOverlay, setShowOverlay] = useState(defaultShowOverlay)
  const hasTrend = Boolean(props.currentTrend?.length && props.currentLevel)
  const rankingTitle = `${props.scopePath.at(-1) ?? '全台'}學校排行`
  const isSchoolTrendReady = !props.selectedSchoolId || props.currentLevel === '學校'

  return (
    <div className="map-mobile-controls-bottom-left">
      {showOverlay && (
        <section id="mobile-analysis-panel" className="map-mobile-panel-group" aria-label="區域資料分析">
          <div className="map-analysis-status" role="status">
            <strong>{activePanel === 'trend' ? snapshot.label : rankingTitle}</strong>
            {(activePanel === 'trend' || !props.selectedSchoolId) && <>
              <span className="map-data-status" data-state={snapshot.status.kind}>{snapshot.status.label}</span>
              {!snapshot.status.hasValue && <span>{snapshot.status.description}</span>}
            </>}
          </div>
          <div className="map-mobile-panel-group__modes" role="group" aria-label="分析方式">
            {modes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                aria-pressed={activePanel === mode.value}
                onClick={() => setActivePanel(mode.value)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className="map-mobile-panel-group__content">
            {activePanel === 'trend' && (hasTrend && isSchoolTrendReady ? (
              <MapTrendCard
                trend={props.currentTrend ?? []}
                activeYear={props.activeYear}
                label={props.currentLabel ?? props.currentLevel ?? ''}
                level={props.currentLevel ?? ''}
                selectableYears={props.summaryYears}
                onSelectYear={(year) => {
                  props.onStopPlayback()
                  props.startTransition(() => props.onSetActiveYear(year))
                }}
              />
            ) : <p className="map-mobile-panel-group__empty">{props.selectedSchoolId && props.isScopeLoading ? '正在載入所選學校的歷史資料…' : '目前範圍尚無歷史趨勢資料。'}</p>)}
            {activePanel !== 'trend' && props.schoolPoints.length === 0 && (
              <p className="map-mobile-panel-group__empty">{props.scopeError ? '學校資料暫時無法載入，請稍後再試。' : props.activeCountyId ? '正在載入學校資料…' : '先點選縣市，再查看區域內的學校排行。'}</p>
            )}
            {activePanel !== 'trend' && props.schoolPoints.length > 0 && (
              <MapSchoolRankingPanel
                schools={props.schoolPoints.filter((school) =>
                  (!props.activeCountyId || school.countyId === props.activeCountyId) &&
                  (!props.activeTownshipId || school.townshipId === props.activeTownshipId),
                )}
                mode={activePanel}
                selectedSchoolId={props.selectedSchoolId}
                onSelectSchool={props.onSelectSchool}
              />
            )}
          </div>
        </section>
      )}
      <div className="map-mobile-dock-row">
        <button
          type="button"
          className="map-analysis-toggle"
          aria-expanded={showOverlay}
          aria-controls="mobile-analysis-panel"
          onClick={() => setShowOverlay((current) => !current)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 4v16h16M8 15v-4m5 4V7m5 8v-6" />
          </svg>
          {showOverlay ? '收起分析' : '顯示分析'}
        </button>
        <MapYearStepper
          activeYear={props.activeYear}
          summaryYears={props.summaryYears}
          isYearPlaybackActive={props.isYearPlaybackActive}
          onSetActiveYear={props.onSetActiveYear}
          onStopPlayback={props.onStopPlayback}
          onTogglePlayback={props.onTogglePlayback}
          startTransition={props.startTransition}
        />
      </div>
    </div>
  )
}
