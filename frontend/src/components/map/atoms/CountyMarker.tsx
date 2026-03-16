import { Marker } from 'react-leaflet'
import L from 'leaflet'
import { renderScopeMarkerIcon, renderScopePillIcon, growthChoroplethColor, buildHoverPreviewHtml } from '../mapStyles'
import type { CountySummary } from '../../../lib/analytics'

export type CountyMarkerProps = {
  county: CountySummary
  position: [number, number]
  isActive: boolean
  usePill: boolean
  isInteractive: boolean
  opacity: number
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  showTooltip: (latlng: L.LatLng, content: string) => void
  hideTooltip: () => void
}

/**
 * Atom: CountyMarker
 * Renders a single county marker or pill on the map.
 */
export const CountyMarker = ({
  county,
  position,
  isActive,
  usePill,
  isInteractive,
  opacity,
  onSelect,
  onHover,
  showTooltip,
  hideTooltip,
}: CountyMarkerProps) => {
  const icon = usePill
    ? renderScopePillIcon(county.shortLabel, growthChoroplethColor(county.deltaRatio), isActive)
    : renderScopeMarkerIcon(county.shortLabel, county.students, growthChoroplethColor(county.deltaRatio), 54, 'county')

  return (
    <Marker
      position={position}
      interactive={isInteractive}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          if (!isInteractive) return
          L.DomEvent.stopPropagation(e.originalEvent)
          onSelect(county.id)
        },
        mouseover: (e) => {
          if (isInteractive) {
            onHover(county.id)
            showTooltip(e.latlng, buildHoverPreviewHtml(county.name, county.students))
          }
        },
        mouseout: () => {
          if (isInteractive) {
            onHover(null)
            hideTooltip()
          }
        },
      }}
      opacity={opacity}
      zIndexOffset={isActive ? 1000 : usePill ? 500 : 0}
    />
  )
}
