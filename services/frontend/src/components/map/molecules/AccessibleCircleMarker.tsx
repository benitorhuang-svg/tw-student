import { useEffect, useRef, type ReactNode } from 'react'
import L from 'leaflet'
import { CircleMarker, Tooltip } from 'react-leaflet'

type AccessibleCircleMarkerProps = {
  ariaLabel: string
  center: [number, number]
  isPressed?: boolean
  onActivate: () => void
  onDoubleActivate?: () => void
  pathOptions: L.PathOptions
  radius: number
  tooltipContent: ReactNode
  children?: ReactNode
}

export function AccessibleCircleMarker({
  ariaLabel,
  center,
  onActivate,
  onDoubleActivate,
  pathOptions,
  radius,
  tooltipContent,
  children,
}: AccessibleCircleMarkerProps) {
  const markerRef = useRef<L.CircleMarker | null>(null)

  useEffect(() => {
    // In Canvas mode, markers don't have individual DOM elements.
    // We only attach accessibility if we're in SVG mode (element exists).
    const marker = markerRef.current
    if (!marker) return

    const element = marker.getElement()
    if (element) {
      element.setAttribute('role', 'button')
      element.setAttribute('aria-label', ariaLabel)
    }
  }, [ariaLabel])

  return (
    <CircleMarker
      ref={markerRef}
      center={center}
      radius={radius}
      pathOptions={{
        ...pathOptions,
        interactive: true,
      }}
      eventHandlers={{
        click: (event) => {
          L.DomEvent.stopPropagation(event.originalEvent)
          markerRef.current?.openTooltip()
          onActivate()
        },
        dblclick: (event) => {
          L.DomEvent.stopPropagation(event.originalEvent)
          onDoubleActivate?.()
        },
        mouseover: (e) => {
          if (e.target.setStyle) {
            e.target.setStyle({ cursor: 'pointer' })
          }
        }
      }}
    >
      <Tooltip direction="top" offset={[0, -6]} className="atlas-map-tooltip atlas-map-tooltip--preview">
        {tooltipContent}
      </Tooltip>
      {children}
    </CircleMarker>
  )
}
