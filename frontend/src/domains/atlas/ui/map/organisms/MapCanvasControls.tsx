import MapBreadcrumb from '../atoms/MapBreadcrumb'
import { MapZoomControls } from '../atoms/MapZoomControls'
import { AtlasMiniMap } from '../molecules/AtlasMiniMap'
import { MapControlStack } from '../molecules/MapControlStack'
import { MapLegend } from '../molecules/MapLegend'
import { getMapScopeSnapshot } from '../mapScopeSnapshot'
import type { SchoolMapPoint } from '../types'

import { MapMobileBottomDock } from './MapMobileBottomDock'
import type { MapCanvasProps } from './MapCanvas.types'

type MapCanvasControlsProps = {
  isMobile: boolean
  props: MapCanvasProps
}

type LabelControlsProps = { showAllLabels: boolean; onToggleLabels: () => void }

export function MapCanvasMapControls({ isMobile, props, showAllLabels, onToggleLabels }: MapCanvasControlsProps & LabelControlsProps) {
  return (
    <>
      <div
        className={isMobile ? 'mobile-utility-pod' : 'map-control-pillar'}
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

      <MapControlStack activeTab={props.activeTab} activeCountyName={props.activeCountyName} legend={
        <MapLegend activeYear={props.activeYear} zoom={props.currentMapZoom ?? 7} hasSchools={Boolean(props.activeCountyId) && props.schoolPoints.length > 0}
          hasBaseline={props.summaryYears.some((year) => Number(year) === Number(props.activeYear) - 1)}
          showAllLabels={showAllLabels} onToggleLabels={onToggleLabels} />
      } />
    </>
  )
}

type MapOverlayProps = MapCanvasControlsProps & {
  selectedSchool: SchoolMapPoint | null
}

export function MapCanvasOverlayControls({ isMobile, props, selectedSchool }: MapOverlayProps) {
  const overlayContextKey = props.selectedSchoolId
    ? `school:${props.selectedSchoolId}`
    : props.activeCountyId ? `county:${props.activeCountyId}` : 'national'
  const defaultActiveBottomPanel = props.selectedSchoolId ? 'trend' : 'students'
  const defaultShowOverlay = Boolean(props.selectedSchoolId)
  const snapshot = getMapScopeSnapshot(props, selectedSchool)

  return (
    <>
      <div
        className="map-top-bar"
      >
        <div
          className="map-top-bar__controls-left"
        >
          <MapBreadcrumb scopePath={props.scopePath} onNavigate={props.onNavigateScope} />
        </div>

        <div
          className="map-top-right-tower"
        >
          <div>
            {props.renderEducationLevelFilter?.(isMobile ? { hideIcon: true } : {})}
          </div>
          <div>
            {props.renderManagementTypeFilter?.(isMobile ? { hideIcon: true } : {})}
          </div>
        </div>
      </div>

      {isMobile ? (
        <MapMobileBottomDock
          key={overlayContextKey}
          props={props}
          defaultActivePanel={defaultActiveBottomPanel}
          defaultShowOverlay={defaultShowOverlay}
          snapshot={snapshot}
        />
      ) : null}
    </>
  )
}
