import { CircleMarker, useMap } from 'react-leaflet'
import { MAP_MAX_ZOOM } from '../../../lib/constants'
import { growthChoroplethColor, growthChoroplethOpacity } from '../mapStyles'
import { buildSchoolMarkerAriaLabel, renderSchoolHoverCard } from '../atoms/MapHoverCard'
import { AccessibleCircleMarker } from '../molecules/AccessibleCircleMarker'
import type { SchoolMapPoint } from '../types'

type SchoolMarkerProps = {
  school: SchoolMapPoint
  isSelected: boolean
  isHighlighted: boolean
  onSelect: (id: string | null) => void
  suppressNextMapClearRef: React.MutableRefObject<boolean>
}

export function SchoolMarker({
  school,
  isSelected,
  isHighlighted,
  onSelect,
  suppressNextMapClearRef
 }: SchoolMarkerProps) {
  const map = useMap()
  const baseRadius = isSelected ? 12 : isHighlighted ? 7 : Math.max(5, Math.min(10, Math.round(school.currentStudents / 150)))
  const absPct = Math.abs(school.deltaRatio * 100)
  const hasGlow = absPct >= 5
  const glowColor = school.deltaRatio >= 0 ? '#22c55e' : '#ef4444'

  return (
    <>
      {/* Selection Pulse Halo */}
      {isSelected && (
        <CircleMarker
          center={[school.latitude, school.longitude]}
          radius={baseRadius + 12}
          pathOptions={{
            className: 'atlas-selected-school-pulse',
            color: '#38bdf8',
            weight: 3,
            fillColor: '#38bdf8',
            fillOpacity: 0.1,
          }}
          interactive={false}
        />
      )}

      {/* Growth/Decline Glow (only when not selected or as a secondary layer) */}
      {!isSelected && hasGlow && (
        <CircleMarker
          center={[school.latitude, school.longitude]}
          radius={baseRadius + Math.min(14, 4 + absPct * 0.4)}
          pathOptions={{ 
            color: glowColor, 
            weight: 0, 
            fillColor: glowColor, 
            fillOpacity: Math.min(0.13, 0.04 + absPct * 0.003) 
          }}
          interactive={false}
        />
      )}

      {/* Base Circle Marker */}
      <AccessibleCircleMarker
        ariaLabel={buildSchoolMarkerAriaLabel(school)}
        center={[school.latitude, school.longitude]}
        isPressed={isSelected || isHighlighted}
        radius={isSelected ? 6 : baseRadius}
        pathOptions={{
          className: `atlas-school-marker atlas-school-marker-${school.id} ${isSelected ? 'atlas-school-marker-selected' : ''}`,
          color: isSelected ? '#38bdf8' : isHighlighted ? '#ffffff' : '#ffffff',
          weight: isSelected ? 3 : 1.5,
          fillColor: growthChoroplethColor(school.deltaRatio),
          fillOpacity: isSelected || isHighlighted ? 1.0 : Math.max(0.65, growthChoroplethOpacity(school.deltaRatio) + 0.1),
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
