import { useState } from 'react'

import { MapYearStepper } from '../atoms/MapYearStepper'
import { MapSchoolRankingPanel } from '../molecules/MapSchoolRankingPanel'
import { MapTrendCard } from '../molecules/MapTrendCard'
import type { MapCanvasProps } from './MapCanvas.types'

type MobilePanel = 'students' | 'growth' | 'decline' | 'trend'

type MapMobileBottomDockProps = {
  props: MapCanvasProps
  defaultActivePanel: 'students' | 'trend'
  defaultShowOverlay: boolean
}

const modes: Array<{ value: MobilePanel; label: string }> = [
  { value: 'students', label: '學生總人數' },
  { value: 'growth', label: '學生增加率' },
  { value: 'decline', label: '學生減少率' },
  { value: 'trend', label: '歷史趨勢' },
]

export function MapMobileBottomDock({
  props,
  defaultActivePanel,
  defaultShowOverlay,
}: MapMobileBottomDockProps) {
  const [activePanel, setActivePanel] = useState<MobilePanel>(defaultActivePanel)
  const [showOverlay, setShowOverlay] = useState(defaultShowOverlay)
  const hasTrend = Boolean(props.currentTrend?.length && props.currentLevel)

  return (
    <div
      className="map-mobile-controls-bottom-left"
      style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        right: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '8px',
        zIndex: 1050,
        pointerEvents: 'none',
      }}
    >
      {showOverlay && (
        <div
          className="map-mobile-panel-group"
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            pointerEvents: 'auto',
            background: 'var(--map-overlay-bg)',
            backdropFilter: 'blur(var(--map-overlay-blur))',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-premium)',
            border: '1px solid var(--map-overlay-border)',
            overflow: 'hidden',
          }}
        >
          <style>{`
            .map-mobile-panel-group > div > section,
            .map-mobile-panel-group > div > .map-trend-card,
            .map-mobile-panel-group .map-school-ranking {
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              background: transparent !important;
              margin: 0 !important;
              backdrop-filter: none !important;
              height: 150px !important;
              max-height: 150px !important;
            }
          `}</style>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '4px',
              padding: '6px',
              borderBottom: '1px solid var(--border-light)',
              width: '100%',
              overflowX: 'auto',
            }}
          >
            {modes.map((mode) => {
              const isActive = activePanel === mode.value
              return (
                <button
                  key={mode.value}
                  onClick={() => {
                    if (activePanel !== mode.value) {
                      setActivePanel(mode.value)
                    }
                  }}
                  style={{
                    padding: '8px 2px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: isActive ? 'var(--brand-primary)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-main)',
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 800 : 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 2px 8px rgb(0 0 0 / 15%)' : 'none',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  {mode.label}
                </button>
              )
            })}
          </div>

          <div>
            {activePanel === 'trend' && hasTrend && (
              <MapTrendCard
                trend={props.currentTrend ?? []}
                activeYear={props.activeYear}
                label={props.currentLabel ?? props.currentLevel ?? ''}
                level={props.currentLevel ?? ''}
              />
            )}

            {activePanel !== 'trend' && (
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
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          width: '100%',
          overflowX: 'auto',
        }}
      >
        <div
          className="map-overlay-toggle-group"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            background: 'var(--map-overlay-bg)',
            backdropFilter: 'blur(var(--map-overlay-blur))',
            borderRadius: '20px',
            padding: '4px',
            boxShadow: 'var(--shadow-premium)',
            border: '1px solid var(--map-overlay-border)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setShowOverlay(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '16px',
              border: 'none',
              background: showOverlay ? 'var(--brand-primary)' : 'transparent',
              color: showOverlay ? '#fff' : 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: showOverlay ? '0 2px 8px rgb(0 0 0 / 15%)' : 'none',
            }}
          >
            圖譜
          </button>
          <button
            onClick={() => setShowOverlay(false)}
            style={{
              padding: '6px 14px',
              borderRadius: '16px',
              border: 'none',
              background: !showOverlay ? 'var(--text-soft)' : 'transparent',
              color: !showOverlay ? '#fff' : 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: !showOverlay ? '0 2px 8px rgb(0 0 0 / 15%)' : 'none',
            }}
          >
            無圖譜
          </button>
        </div>

        <div style={{ pointerEvents: 'auto', flexShrink: 0 }}>
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
    </div>
  )
}
