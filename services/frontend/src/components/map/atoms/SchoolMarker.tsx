import L from 'leaflet'
import { memo } from 'react'
import { CircleMarker, useMap } from 'react-leaflet'
import { MAP_MAX_ZOOM } from '../../../lib/constants'
import { growthChoroplethColor, growthChoroplethOpacity } from '../mapStyles'
import { buildSchoolMarkerAriaLabel, renderSchoolHoverCard } from '../atoms/MapHoverCard'
import { AccessibleShapeMarker } from '../molecules/AccessibleShapeMarker'
import type { SchoolMapPoint } from '../types'

type SchoolMarkerProps = {
  school: SchoolMapPoint
  zoom: number
  isSelected: boolean
  isHighlighted: boolean
  onSelect: (id: string | null) => void
  suppressNextMapClearRef: React.MutableRefObject<boolean>
}

export const SchoolMarker = memo(function SchoolMarker({
  school,
  zoom,
  isSelected,
  isHighlighted,
  onSelect,
  suppressNextMapClearRef
}: SchoolMarkerProps) {
  const map = useMap()

  // If selected, we don't render anything on the Canvas layer.
  // The SelectedSchoolMarker (Molecule) in MapLayerStack will handle the 
  // synchronous rendering of both the dot and the star on the HTML layer.
  if (isSelected) return null

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

  return (
    <>
      {/* Growth/Decline Glow */}
      {hasGlow && (
        <CircleMarker
          center={[school.latitude, school.longitude]}
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
        radius={hitZoneRadius}
        pathOptions={{
          color: 'rgba(255, 255, 255, 0.3)',
          weight: 1,
          fillColor: 'rgba(255, 255, 255, 0.08)',
          fillOpacity: 1,
          className: 'atlas-school-marker-hitzone',
        }}
        eventHandlers={{
          click: (e) => {
            // Forward click to selection logic
            L.DomEvent.stopPropagation(e.originalEvent)
            suppressNextMapClearRef.current = true
            onSelect(school.id)
          },
          dblclick: () => {
            map.flyTo([school.latitude, school.longitude], MAP_MAX_ZOOM, { animate: true, duration: 1.2 })
          },
          mouseover: (e) => {
            const target = e.target as L.Path
            const element = target.getElement() as SVGElement | null
            if (element) {
              element.style.cursor = 'pointer'
            }
          }
        }}
      />

      {/* Base Shape Marker */}
      <AccessibleShapeMarker
        ariaLabel={buildSchoolMarkerAriaLabel(school)}
        center={[school.latitude, school.longitude]}
        level={school.educationLevel}
        isPressed={isHighlighted}
        radius={baseRadius}
        color={isHighlighted ? '#ffffff' : '#ffffff'}
        weight={1.5}
        fillColor={growthChoroplethColor(school.deltaRatio)}
        fillOpacity={isHighlighted ? 1.0 : Math.max(0.65, growthChoroplethOpacity(school.deltaRatio) + 0.1)}
        onActivate={() => {
          suppressNextMapClearRef.current = true
          onSelect(school.id)
        }}
        onDoubleActivate={() => {
          map.flyTo([school.latitude, school.longitude], MAP_MAX_ZOOM, { animate: true, duration: 1.2 })
        }}
        tooltipContent={renderSchoolHoverCard(school)}
      />
    </>
  )
})
