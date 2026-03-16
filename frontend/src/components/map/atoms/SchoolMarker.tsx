import { CircleMarker, useMap } from 'react-leaflet'
import { MAP_MAX_ZOOM } from '../../../lib/constants'
import { growthChoroplethColor, growthChoroplethOpacity } from '../mapStyles'
import { buildSchoolMarkerAriaLabel, renderSchoolHoverCard } from '../atoms/MapHoverCard'
import { AccessibleCircleMarker } from '../molecules/AccessibleCircleMarker'
import type { SchoolMapPoint } from '../types'

type SchoolMarkerProps = {
  school: SchoolMapPoint
  zoom: number
  isSelected: boolean
  isHighlighted: boolean
  onSelect: (id: string | null) => void
  suppressNextMapClearRef: React.MutableRefObject<boolean>
}

export function SchoolMarker({
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
  if (isSelected) return null;

  // Scale markers based on zoom level to reduce visual noise when zoomed out
  const zoomFactor = Math.max(0.6, Math.min(1.2, (zoom - 10) * 0.4 + 1))
  const baseRadius = isHighlighted 
    ? 7 
    : Math.max(3, Math.min(8, Math.round(school.currentStudents / 250))) * zoomFactor
    
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

      {/* Base Circle Marker */}
      <AccessibleCircleMarker
        ariaLabel={buildSchoolMarkerAriaLabel(school)}
        center={[school.latitude, school.longitude]}
        isPressed={isHighlighted}
        radius={baseRadius}
        pathOptions={{
          className: `atlas-school-marker atlas-school-marker-${school.id}`,
          color: isHighlighted ? '#ffffff' : '#ffffff',
          weight: 1.5,
          fillColor: growthChoroplethColor(school.deltaRatio),
          fillOpacity: isHighlighted ? 1.0 : Math.max(0.65, growthChoroplethOpacity(school.deltaRatio) + 0.1),
        }}
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
}
