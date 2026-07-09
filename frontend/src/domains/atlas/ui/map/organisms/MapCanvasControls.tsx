import { useState } from 'react'
import MapBreadcrumb from '../atoms/MapBreadcrumb'
import { MapYearStepper } from '../atoms/MapYearStepper'
import { MapZoomControls } from '../atoms/MapZoomControls'
import { AtlasMiniMap } from '../molecules/AtlasMiniMap'
import { MapControlStack } from '../molecules/MapControlStack'
import { MapSchoolRankingPanel } from '../molecules/MapSchoolRankingPanel'
import { MapTrendCard } from '../molecules/MapTrendCard'
import { CollapsibleFilter } from '../molecules/CollapsibleFilter'

import type { MapCanvasProps } from './MapCanvas.types'

type MapCanvasControlsProps = {
  isMobile: boolean
  props: MapCanvasProps
}

export function MapCanvasMapControls({ isMobile, props }: MapCanvasControlsProps) {
  return (
    <>
      <div
        className={isMobile ? 'mobile-utility-pod' : 'map-control-pillar'}
        style={{
          position: 'absolute',
          top: '55px',
          left: isMobile ? '6px' : '16px',
          bottom: 'auto',
          right: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: isMobile ? '8px' : '12px',
          zIndex: 1000,
        }}
      >
        <AtlasMiniMap
          countyBoundaries={props.countyBoundaries}
          activeCountyId={props.activeCountyId}
          onSelectCounty={props.onSelectCounty}
          isVisible={true}
          style={{ marginLeft: 0 }}
        />
        <div style={{ pointerEvents: 'auto' }}>
          <MapZoomControls isMobile={isMobile} />
        </div>
      </div>

      <MapControlStack activeTab={props.activeTab} activeCountyName={props.activeCountyName} />
    </>
  )
}

export function MapCanvasOverlayControls({ isMobile, props }: MapCanvasControlsProps) {
  const [activeBottomPanel, setActiveBottomPanel] = useState<'ranking' | 'trend' | 'none'>('ranking')

  return (
    <>
      <div
        className="map-top-bar"
        style={{
          position: 'absolute',
          top: isMobile ? '10px' : '16px',
          left: 0,
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '0 8px',
        }}
      >
        <div
          className="map-top-bar__controls-left"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', pointerEvents: 'auto' }}
        >
          <MapBreadcrumb scopePath={props.scopePath} onNavigate={props.onNavigateScope} />
        </div>

        <div
          className="map-top-right-tower"
          style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end', gap: '8px', pointerEvents: 'auto' }}
        >
          <div style={{ width: isMobile ? 'auto' : '140px' }}>
            {props.renderEducationLevelFilter?.(isMobile ? { hideIcon: true } : {})}
          </div>
          <div style={{ width: isMobile ? 'auto' : '140px' }}>
            {props.renderManagementTypeFilter?.(isMobile ? { hideIcon: true } : {})}
          </div>
          {isMobile && (
            <div style={{ width: 'auto' }}>
              <CollapsibleFilter
                label="圖表顯示"
                options={[
                  { value: 'ranking', label: '學生總人數' },
                  { value: 'trend', label: '歷史趨勢' },
                  { value: 'none', label: '無圖譜' }
                ]}
                currentValue={activeBottomPanel}
                onSelect={(val) => setActiveBottomPanel(val as 'ranking' | 'trend' | 'none')}
                icon={undefined}
              />
            </div>
          )}
        </div>
      </div>

      {isMobile ? (
        <>
          {activeBottomPanel === 'trend' && <MapMobileTimelineControls props={props} />}
          {activeBottomPanel === 'ranking' && (
            <div className="map-school-ranking-dock">
              <MapSchoolRankingPanel
                schools={props.schoolPoints.filter((school) =>
                  (!props.activeCountyId || school.countyId === props.activeCountyId) &&
                  (!props.activeTownshipId || school.townshipId === props.activeTownshipId),
                )}
                selectedSchoolId={props.selectedSchoolId}
                onSelectSchool={props.onSelectSchool}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <MapDesktopYearBadge activeYear={props.activeYear} />
          <div className="map-school-ranking-dock">
            <MapSchoolRankingPanel
              schools={props.schoolPoints.filter((school) =>
                (!props.activeCountyId || school.countyId === props.activeCountyId) &&
                (!props.activeTownshipId || school.townshipId === props.activeTownshipId),
              )}
              selectedSchoolId={props.selectedSchoolId}
              onSelectSchool={props.onSelectSchool}
            />
          </div>
        </>
      )}
    </>
  )
}

function MapMobileTimelineControls({ props }: { props: MapCanvasProps }) {
  const hasTrend = Boolean(props.currentTrend?.length && props.currentLevel)

  return (
    <div
      className="map-mobile-controls-bottom-right"
      style={{
        position: 'absolute',
        bottom: '16px',
        right: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        zIndex: 1050,
        pointerEvents: 'none',
      }}
    >
      {hasTrend ? (
        <div style={{ pointerEvents: 'auto' }}>
          <MapTrendCard
            trend={props.currentTrend ?? []}
            activeYear={props.activeYear}
            label={props.currentLabel ?? props.currentLevel ?? ''}
            level={props.currentLevel ?? ''}
          />
        </div>
      ) : null}

      <div style={{ pointerEvents: 'auto' }}>
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

function MapDesktopYearBadge({ activeYear }: { activeYear: number }) {
  return (
    <div
      className="map-desktop-controls-bottom-right"
      style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        zIndex: 1050,
        pointerEvents: 'none',
      }}
    >
      <div
        className="map-western-year-badge"
        style={{
          height: '40px',
          width: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--map-overlay-bg)',
          backdropFilter: 'blur(var(--map-overlay-blur))',
          border: '1px solid var(--map-overlay-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          fontWeight: 800,
          color: 'var(--brand-primary)',
          boxShadow: 'var(--shadow-premium)',
          letterSpacing: '0.02em',
          pointerEvents: 'auto',
        }}
      >
        {String(Number(activeYear) + 1910)} - {String(Number(activeYear) + 1911)}
      </div>
    </div>
  )
}
