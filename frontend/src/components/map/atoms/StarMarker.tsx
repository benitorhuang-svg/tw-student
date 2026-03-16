import { useRef, useEffect } from 'react'
import L from 'leaflet'
import { Marker, Tooltip } from 'react-leaflet'

interface StarMarkerProps {
  position: [number, number]
  size?: number
  color?: string
  isSelected?: boolean
  tooltipContent?: React.ReactNode
  onActivate?: () => void
  ariaLabel?: string
}

/**
 * Atomic Star Marker component for map highlights.
 * Uses a DivIcon to allow for CSS-based animations (floating, twinkling).
 */
export const StarMarker: React.FC<StarMarkerProps> = ({
  position,
  size = 32,
  color = '#fbbf24',
  isSelected = false,
  tooltipContent,
  onActivate,
  ariaLabel
}) => {
  const markerRef = useRef<L.Marker>(null)

  const icon = L.divIcon({
    className: 'atlas-star-marker-container',
    html: `
      <div 
        class="atlas-star-marker-atom ${isSelected ? 'is-selected' : ''}" 
        style="width: ${size}px; height: ${size}px; color: ${color};"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })

  useEffect(() => {
    const el = markerRef.current?.getElement()
    if (!el) return
    
    el.setAttribute('role', 'button')
    if (ariaLabel) el.setAttribute('aria-label', ariaLabel)
    if (isSelected) el.setAttribute('aria-pressed', 'true')
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && onActivate) {
        e.preventDefault()
        onActivate()
      }
    }
    
    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [isSelected, ariaLabel, onActivate])

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      zIndexOffset={2000} // Ensure it's above normal markers
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e.originalEvent)
          onActivate?.()
        }
      }}
    >
      {tooltipContent && (
        <Tooltip direction="top" offset={[0, -size / 1.5]} className="atlas-map-tooltip">
          {tooltipContent}
        </Tooltip>
      )}
    </Marker>
  )
}
