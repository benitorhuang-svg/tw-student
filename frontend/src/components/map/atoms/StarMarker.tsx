import React, { useRef, useEffect } from 'react'
import L from 'leaflet'
import { Marker, Tooltip } from 'react-leaflet'
import { growthChoroplethColor } from '../mapStyles'

interface StarMarkerProps {
  position: [number, number]
  size?: number
  color?: string
  isSelected?: boolean
  deltaRatio?: number
  tooltipContent?: React.ReactNode
  onActivate?: () => void
  ariaLabel?: string
  zoom?: number
}

/**
 * Molecule: SelectedSchoolIndicator
 * Combines the Star and the underlying Dot into a single DOM unit to 
 * ensure perfect synchronization during map movement.
 */
export const StarMarker: React.FC<StarMarkerProps> = ({
  position,
  size = 36,
  color = '#fbbf24',
  isSelected = false,
  deltaRatio = 0,
  tooltipContent,
  onActivate,
  ariaLabel,
  zoom = 11
}) => {
  const markerRef = useRef<L.Marker>(null)
  
  // Scale the star based on zoom level just like regular school markers
  const dynamicSize = size * (zoom / 11)
  
  const dotColor = growthChoroplethColor(deltaRatio)

  const icon = L.divIcon({
    className: 'atlas-selected-marker-molecule-container',
    html: `
      <div class="atlas-selected-marker-sync-group" style="width: ${dynamicSize}px; height: ${dynamicSize}px;">
        <!-- The underlying dot (matches normal school markers) -->
        <div class="atlas-selected-dot-base" style="background-color: ${dotColor};"></div>
        
        <!-- The star on top -->
        <div class="atlas-star-icon-wrap" style="color: ${color};">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [dynamicSize, dynamicSize],
    iconAnchor: [dynamicSize / 2, dynamicSize / 2],
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
      zIndexOffset={5000} 
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
