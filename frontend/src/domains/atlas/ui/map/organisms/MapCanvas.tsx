import { useMemo, useState } from 'react'
import { MapContainer } from 'react-leaflet'

import { useIsMobile } from '@/shared/lib/hooks/core/useIsMobile'
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, MAP_MAX_BOUNDS, MAP_MAX_ZOOM } from '@/shared/lib/utils/constants'
import { MapEvents } from '../atoms/MapEvents'
import { MapTileLayer } from '../atoms/MapTileLayer'
import { MapLayerStack } from '../molecules/MapLayerStack'
import { useMapComputedState } from '../useMapComputedState'
import type { SchoolMapPoint } from '../types'
import MapBoundsController from './MapBoundsController'
import { MapCanvasMapControls, MapCanvasOverlayControls } from './MapCanvasControls'
import type { MapCanvasProps } from './MapCanvas.types'

function toFiniteZoom(zoom: unknown): number | null {
  return typeof zoom === 'number' && Number.isFinite(zoom) ? zoom : null
}

export default function MapCanvas(props: MapCanvasProps) {
  const {
    activeCountyId, activeTownshipId, theme, countyBoundaries,
    townshipBoundaries, townshipRows, allTownshipRows, allTownshipBoundaries,
    schoolPoints, selectedSchoolId, highlightedCountyId,
    highlightedTownshipId, highlightedSchoolId,
    onSelectSchool, initialMapZoom, initialMapLat, initialMapLon,
    vectorTileBaseUrl = '', forceTownshipLabels = false
  } = props

  const isMobile = useIsMobile()
  const resolvedInitialMapZoom = toFiniteZoom(initialMapZoom)
  const resolvedCurrentMapZoom = toFiniteZoom(props.currentMapZoom)

  const selectedSchool = useMemo(() => {
    const directMatch = selectedSchoolId
      ? schoolPoints.find((school) => school.id === selectedSchoolId) ?? null
      : null

    if (directMatch || !selectedSchoolId || !props.summaryDataset?.schoolCodeIndex) {
      return directMatch
    }

    const entry = Object.values(props.summaryDataset.schoolCodeIndex).find((value) =>
      value.schoolIds?.includes(selectedSchoolId),
    )
    if (entry?.longitude && entry?.latitude) {
      return {
        id: selectedSchoolId,
        name: entry.name,
        latitude: entry.latitude,
        longitude: entry.longitude,
      } as SchoolMapPoint
    }

    return null
  }, [props.summaryDataset, schoolPoints, selectedSchoolId])

  const [hoveredCountyId, setHoveredCountyId] = useState<string | null>(null)
  const [hoveredTownshipId, setHoveredTownshipId] = useState<string | null>(null)

  const visibleTownshipRows = useMemo(
    () => (allTownshipRows.length > 0 ? allTownshipRows : townshipRows),
    [allTownshipRows, townshipRows],
  )
  const computed = useMapComputedState(
    props.counties, activeCountyId, activeTownshipId,
    countyBoundaries, townshipBoundaries, townshipRows, schoolPoints,
    resolvedCurrentMapZoom, undefined
  )

  return (
    <section className="panel atlas-map-panel">
      <div className="atlas-map-shell">
        <div className="atlas-map-canvas-wrap" data-township-markers={forceTownshipLabels ? 'true' : 'false'}>

          <MapContainer
            center={[initialMapLat ?? MAP_DEFAULT_CENTER[0], initialMapLon ?? MAP_DEFAULT_CENTER[1]]}
            zoom={resolvedInitialMapZoom ?? MAP_DEFAULT_ZOOM}
            preferCanvas={true}
            minZoom={MAP_DEFAULT_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
            maxBounds={MAP_MAX_BOUNDS}
            maxBoundsViscosity={1.0}
            zoomControl={false}
            zoomSnap={0}
            zoomDelta={1}
            className="atlas-map-canvas"
            attributionControl={false}
            inertia={false}
            zoomAnimation={true}
            fadeAnimation={false}
          >
            <MapTileLayer theme={theme} />
            <MapEvents onBackgroundClick={() => {
              if (selectedSchoolId) onSelectSchool(null)
            }} />

            <MapLayerStack
              {...props}
              {...computed}
              hoveredCountyId={hoveredCountyId}
              hoveredTownshipId={hoveredTownshipId}
              setHoveredCountyId={setHoveredCountyId}
              setHoveredTownshipId={setHoveredTownshipId}
              visibleTownshipRows={visibleTownshipRows}
              selectedSchoolId={selectedSchoolId}
              selectedSchoolPoint={selectedSchool}
              vectorTileBaseUrl={vectorTileBaseUrl}
              onVectorTileError={props.onVectorTileError ?? (() => {})}
              onHoverCounty={props.onHoverCounty ?? (() => {})}
              highlightedCountyId={highlightedCountyId ?? null}
              highlightedTownshipId={highlightedTownshipId ?? null}
              highlightedSchoolId={highlightedSchoolId ?? null}
              currentMapZoom={resolvedCurrentMapZoom}
              allTownshipBoundaries={allTownshipBoundaries}
              forceTownshipLabels={forceTownshipLabels}
            />

            <MapBoundsController
              {...props}
              isMobile={isMobile}
              selectedSchoolPoint={selectedSchool}
              initialZoomFromUrl={resolvedInitialMapZoom}
              initialLatFromUrl={initialMapLat}
              initialLonFromUrl={initialMapLon}
            />

            <MapCanvasMapControls isMobile={isMobile} props={props} />
          </MapContainer>

          <MapCanvasOverlayControls isMobile={isMobile} props={props} />
        </div>
      </div>
    </section>
  )
}
