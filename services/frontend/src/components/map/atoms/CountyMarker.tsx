import { useEffect, useRef } from 'react'
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
  const markerRef = useRef<L.Marker | null>(null)
  const icon = usePill
    ? renderScopePillIcon(county.shortLabel, growthChoroplethColor(county.deltaRatio), isActive)
    : renderScopeMarkerIcon(county.shortLabel, county.students, growthChoroplethColor(county.deltaRatio), 54, 'county')

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) return

    let frameId = 0
    let element: HTMLElement | null = null
    const latlng = L.latLng(position[0], position[1])
    const tooltipContent = buildHoverPreviewHtml(county.name, county.students)

    const attachAccessibility = () => {
      element = marker.getElement() ?? null
      if (!element) {
        frameId = window.requestAnimationFrame(attachAccessibility)
        return
      }

      element.setAttribute('tabindex', '0')
      element.setAttribute('role', 'button')
      element.setAttribute('aria-label', `查看 ${county.name}`)
      if (isActive) {
        element.setAttribute('aria-pressed', 'true')
      } else {
        element.removeAttribute('aria-pressed')
      }

      const handleFocus = () => {
        if (isInteractive) {
          onHover(county.id)
          showTooltip(latlng, tooltipContent)
        }
      }
      const handleBlur = () => {
        onHover(null)
        hideTooltip()
      }
      const handleKeyDown = (event: KeyboardEvent) => {
        if (!isInteractive) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(county.id)
        }
        if (event.key === 'Escape') {
          hideTooltip()
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
  }, [county.id, county.name, county.students, hideTooltip, isActive, isInteractive, onHover, onSelect, position, showTooltip])

  return (
    <Marker
      ref={markerRef}
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
