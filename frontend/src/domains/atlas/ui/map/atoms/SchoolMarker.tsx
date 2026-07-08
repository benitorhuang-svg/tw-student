import L from 'leaflet'
import { memo, useCallback, useMemo, type MutableRefObject } from 'react'
import { CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet'
import { MAP_MAX_ZOOM } from '@/shared/lib/utils/constants'
import { growthChoroplethColor, growthChoroplethOpacity } from '../mapStyles'
import { buildSchoolMarkerAriaLabel, renderSchoolHoverCard } from './MapHoverCard'
import { AccessibleCircleMarker } from '../molecules/AccessibleCircleMarker'
import type { SchoolMapPoint } from '../types'

type SchoolMarkerProps = {
  school: SchoolMapPoint
  zoom: number
  isSelected: boolean
  isHighlighted: boolean
  onSelect: (id: string | null) => void
  pane: string
  interactionPane: string
  suppressNextMapClearRef: MutableRefObject<boolean>
}

function escapeHtmlAttribute(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return character
    }
  })
}

export const SchoolMarker = memo(function SchoolMarker({
  school,
  zoom,
  isSelected,
  isHighlighted,
  onSelect,
  pane,
  interactionPane,
  suppressNextMapClearRef
}: SchoolMarkerProps) {
  const map = useMap()

  // Scale logic: Start as small dots at Zoom 11, grow more aggressively as we zoom in
  // - Zoom 11: zoomFactor approx 1.0 (Small dots)
  // - Zoom 15: zoomFactor approx 3.0+ (Large markers)
  const zoomFactor = Math.pow(1.35, Math.max(0, zoom - 11))
  
  const baseRadius = isHighlighted
    ? 6 * zoomFactor
    : (Math.sqrt(school.currentStudents ?? 0) * 0.15 + 2) * zoomFactor

  // At Zoom 11, keep hit zone manageable (20px), then scale up with the marker
  const hitZoneRadius = Math.max(20, baseRadius * 1.4)

  const absPct = Math.abs(school.deltaRatio * 100)
  // Disable glow at low zoom levels to reduce clutter
  const hasGlow = !isSelected && absPct >= 5 && zoom >= 11
  const glowColor = school.deltaRatio >= 0 ? '#22c55e' : '#ef4444'
  const glowOpacityFactor = Math.max(0.2, Math.min(1, (zoom - 11) * 0.5 + 0.5))
  const ariaLabel = buildSchoolMarkerAriaLabel(school)
  const tooltipContent = renderSchoolHoverCard(school)
  const hitIcon = useMemo(
    () =>
      L.divIcon({
        className: 'atlas-school-marker-hit-target',
        html: `<span aria-hidden="true" data-school-marker-id="${escapeHtmlAttribute(school.id)}"></span>`,
        iconSize: [hitZoneRadius * 2, hitZoneRadius * 2],
        iconAnchor: [hitZoneRadius, hitZoneRadius],
      }),
    [hitZoneRadius, school.id],
  )

  const selectSchool = useCallback((event?: L.LeafletMouseEvent) => {
    if (event) L.DomEvent.stopPropagation(event.originalEvent)
    suppressNextMapClearRef.current = true
    onSelect(school.id)
  }, [onSelect, school.id, suppressNextMapClearRef])

  // If selected, we don't render anything on the Canvas layer.
  // The SelectedSchoolMarker (Molecule) in MapLayerStack will handle the
  // synchronous rendering of both the dot and the star on the HTML layer.
  if (isSelected) return null

  return (
    <>
      {/* Growth/Decline Glow */}
      {hasGlow && (
        <CircleMarker
          center={[school.latitude, school.longitude]}
          pane={pane}
          radius={baseRadius + Math.min(10, 2 + absPct * 0.2) * zoomFactor}
          pathOptions={{
            color: glowColor,
            weight: 0,
            fillColor: glowColor,
            fillOpacity: Math.min(0.1, (0.02 + absPct * 0.002) * glowOpacityFactor)
          }}
          interactive={false}
        />
      )}

      {/* Frosted/Matte Hit Zone for better visual click target indication */}
      <CircleMarker
        center={[school.latitude, school.longitude]}
        pane={pane}
        radius={hitZoneRadius}
        pathOptions={{
          color: 'rgba(255, 255, 255, 0.3)',
          weight: 1,
          fillColor: 'rgba(255, 255, 255, 0.08)',
          fillOpacity: 1,
          className: 'atlas-school-marker-hitzone',
        }}
        interactive={false}
      />

      {/* Base Circle Marker */}
      <AccessibleCircleMarker
        ariaLabel={ariaLabel}
        center={[school.latitude, school.longitude]}
        pane={pane}
        isPressed={isHighlighted}
        radius={baseRadius}
        pathOptions={{
          className: `atlas-school-marker atlas-school-marker-${school.id}`,
          color: isHighlighted ? '#ffffff' : '#ffffff',
          weight: 1.5,
          fillColor: growthChoroplethColor(school.deltaRatio),
          fillOpacity: isHighlighted ? 1.0 : Math.max(0.65, growthChoroplethOpacity(school.deltaRatio) + 0.1),
        }}
        onActivate={() => selectSchool()}
        onDoubleActivate={() => {
          map.flyTo([school.latitude, school.longitude], MAP_MAX_ZOOM, { animate: true, duration: 1.2 })
        }}
        tooltipContent={tooltipContent}
      />

      <Marker
        position={[school.latitude, school.longitude]}
        pane={interactionPane}
        icon={hitIcon}
        keyboard={true}
        title={ariaLabel}
        zIndexOffset={4000}
        eventHandlers={{
          click: selectSchool,
          dblclick: (event) => {
            L.DomEvent.stopPropagation(event.originalEvent)
            map.flyTo([school.latitude, school.longitude], MAP_MAX_ZOOM, { animate: true, duration: 1.2 })
          },
        }}
      >
        <Tooltip direction="top" offset={[0, -6]} className="atlas-map-tooltip atlas-map-tooltip--preview">
          {tooltipContent}
        </Tooltip>
      </Marker>
    </>
  )
})
