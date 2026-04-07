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
  isPressed = false,
  onActivate,
  onDoubleActivate,
  pathOptions,
  radius,
  tooltipContent,
  children,
}: AccessibleCircleMarkerProps) {
  const markerRef = useRef<L.CircleMarker | null>(null)

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    let frameId = 0
    let element: SVGElement | null = null

    const attachAccessibility = () => {
      element = marker.getElement() as SVGElement | null
      if (!element) {
        frameId = window.requestAnimationFrame(attachAccessibility)
        return
      }

      element.setAttribute('tabindex', '0')
      element.setAttribute('role', 'button')
      element.setAttribute('aria-label', ariaLabel)
      if (isPressed) {
        element.setAttribute('aria-pressed', 'true')
      } else {
        element.removeAttribute('aria-pressed')
      }

      const handleFocus = () => marker.openTooltip()
      const handleBlur = () => marker.closeTooltip()
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          marker.openTooltip()
          onActivate()
        }
        if (event.key === 'Escape') {
          marker.closeTooltip()
        }
      }

      element.addEventListener('focus', handleFocus)
      element.addEventListener('blur', handleBlur)
      element.addEventListener('keydown', handleKeyDown)

      return () => {
        element?.removeEventListener('focus', handleFocus)
        element?.removeEventListener('blur', handleBlur)
        element?.removeEventListener('keydown', handleKeyDown)
      }
    }

    const cleanup = attachAccessibility()
    return () => {
      window.cancelAnimationFrame(frameId)
      cleanup?.()
    }
  }, [ariaLabel, isPressed, onActivate])

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
