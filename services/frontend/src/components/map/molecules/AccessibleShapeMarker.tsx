import { useEffect, useRef, type ReactNode } from 'react'
import L from 'leaflet'
import { Marker, Tooltip } from 'react-leaflet'
import { getSchoolShapePath } from '../schoolShapeUtils'

type Props = {
  ariaLabel: string
  center: [number, number]
  level: string
  radius: number
  color: string
  fillColor: string
  fillOpacity: number
  weight: number
  isPressed?: boolean
  onActivate: () => void
  onDoubleActivate?: () => void
  tooltipContent: ReactNode
}

export function AccessibleShapeMarker({
  ariaLabel,
  center,
  level,
  radius: rawRadius,
  color,
  fillColor,
  fillOpacity,
  weight,
  isPressed = false,
  onActivate,
  onDoubleActivate,
  tooltipContent,
}: Props) {
  const markerRef = useRef<L.Marker | null>(null)
  
  // Safety guard against NaN radius which can break SVG attributes
  const radius = (typeof rawRadius !== 'number' || isNaN(rawRadius) || rawRadius <= 0) ? 4 : rawRadius;

  const path = getSchoolShapePath(level, radius)
  
  const icon = L.divIcon({
    className: 'atlas-shape-marker-icon',
    html: path 
      ? `<svg width="${radius * 4}" height="${radius * 4}" viewBox="${-radius * 2} ${-radius * 2} ${radius * 4} ${radius * 4}" style="display: block; overflow: visible;">
          <path d="${path}" fill="${fillColor}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="${weight}" />
         </svg>`
      : `<svg width="${radius * 4}" height="${radius * 4}" viewBox="${-radius * 2} ${-radius * 2} ${radius * 4} ${radius * 4}" style="display: block; overflow: visible;">
          <circle cx="0" cy="0" r="${radius}" fill="${fillColor}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="${weight}" />
         </svg>`,
    iconSize: [radius * 2, radius * 2],
    iconAnchor: [radius, radius]
  })

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    const element = marker.getElement()
    if (element) {
      element.setAttribute('tabindex', '0')
      element.setAttribute('role', 'button')
      element.setAttribute('aria-label', ariaLabel)
      if (isPressed) {
        element.setAttribute('aria-pressed', 'true')
      }
    }
  }, [ariaLabel, isPressed])

  return (
    <Marker
      ref={markerRef}
      position={center}
      icon={icon}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e.originalEvent)
          onActivate()
        },
        dblclick: (e) => {
          L.DomEvent.stopPropagation(e.originalEvent)
          onDoubleActivate?.()
        }
      }}
    >
      <Tooltip direction="top" offset={[0, -radius]} className="atlas-map-tooltip atlas-map-tooltip--preview">
        {tooltipContent}
      </Tooltip>
    </Marker>
  )
}
