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
  const baseRadius = isSelected ? 8 : isHighlighted ? 7 : Math.max(5, Math.min(10, Math.round(school.currentStudents / 150)))
  const absPct = Math.abs(school.deltaRatio * 100)
  const hasGlow = absPct >= 5
  const glowColor = school.deltaRatio >= 0 ? '#22c55e' : '#ef4444'

  return (
    <>
      {hasGlow && (
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
      <AccessibleCircleMarker
        ariaLabel={buildSchoolMarkerAriaLabel(school)}
        center={[school.latitude, school.longitude]}
        isPressed={isSelected}
        radius={baseRadius}
        pathOptions={{
          className: `atlas-school-marker atlas-school-marker-${school.id}`,
          color: isSelected || isHighlighted ? '#f8fafc' : '#0f172a',
          weight: isSelected ? 2.5 : isHighlighted ? 2 : 1,
          fillColor: growthChoroplethColor(school.deltaRatio),
          fillOpacity: isHighlighted ? 0.94 : Math.max(0.58, growthChoroplethOpacity(school.deltaRatio) + 0.12),
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
