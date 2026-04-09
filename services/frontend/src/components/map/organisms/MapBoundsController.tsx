import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'

import type { CountyBoundaryCollection, RegionGroupFilter, TownshipBoundaryCollection } from '../../../data/educationData'
import type { SchoolMapPoint } from '../types'
import { MAP_MAX_BOUNDS } from '../../../lib/constants'
import { useViewportIntent } from '../hooks/useViewportIntent'

const AUTO_SELECT_SUPPRESSION_MS = 2000
type MapBoundsControllerProps = {
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  activeCountyId: string | null
  activeTownshipId: string | null
  selectedSchoolPoint: SchoolMapPoint | null
  activeRegion: RegionGroupFilter
  mapResetToken: number
  isMobile: boolean
  onZoomChange?: (zoom: number) => void
  onMoveEnd?: (lat: number, lon: number) => void
  initialZoomFromUrl?: number | null
  initialLatFromUrl?: number | null
  initialLonFromUrl?: number | null
  onHoverCounty?: (countyId: string | null) => void
  currentMapZoom?: number | null
}

function MapBoundsController({
  countyBoundaries,
  townshipBoundaries,
  activeCountyId,
  activeTownshipId,
  selectedSchoolPoint,
  activeRegion,
  mapResetToken,
  isMobile,
  onZoomChange,
  onMoveEnd,
  onHoverCounty,
  currentMapZoom = null,
  initialZoomFromUrl = null,
  initialLatFromUrl = null,
  initialLonFromUrl = null,
}: MapBoundsControllerProps) {
  const map = useMap()

  // Dynamic padding based on responsivity
  const dynamicPaddingTopLeft: L.PointExpression = isMobile ? [20, 80] : [400, 100]
  const dynamicPaddingBottomRight: L.PointExpression = isMobile ? [20, 80] : [60, 60]

  const lastAutoSelectRef = useRef<string | null>(null)
  const hasInitialCenter = initialLatFromUrl != null && initialLonFromUrl != null
  const pendingInitialZoomRef = useRef<number | null>(initialZoomFromUrl)
  const pendingInitialCenterRef = useRef<[number, number] | null>(
    hasInitialCenter ? [initialLatFromUrl, initialLonFromUrl] : null,
  )

  const lastAppliedIntentIdRef = useRef<string>('init')
  const lastAutoSelectAttemptRef = useRef<{ countyId: string | null; time: number | null }>({ countyId: null, time: null })
  const suppressAutoSelectUntilRef = useRef(0)
  const prevMapResetTokenRef = useRef(mapResetToken)

  useEffect(() => {
    if (mapResetToken !== prevMapResetTokenRef.current) {
      prevMapResetTokenRef.current = mapResetToken
      suppressAutoSelectUntilRef.current = Date.now() + AUTO_SELECT_SUPPRESSION_MS
      lastAutoSelectRef.current = null
      lastAutoSelectAttemptRef.current = { countyId: null, time: null }
    }
  }, [mapResetToken])

  // Clear initial refs if a school is selected, to ensure school focus takes priority
  useEffect(() => {
    if (selectedSchoolPoint) {
      pendingInitialCenterRef.current = null
      pendingInitialZoomRef.current = null
    }
  }, [selectedSchoolPoint])

  const viewportIntent = useViewportIntent(
    countyBoundaries,
    townshipBoundaries,
    activeCountyId,
    activeTownshipId,
    selectedSchoolPoint,
    activeRegion,
    map.getZoom(),
    currentMapZoom,
    lastAppliedIntentIdRef,
    pendingInitialCenterRef,
    pendingInitialZoomRef,
    lastAutoSelectAttemptRef,
    mapResetToken,
    isMobile
  )

  useEffect(() => {
    const handleInteraction = () => {
      // If the user manually moves the map, suppress auto-select 
      // for a while to let them browse freely.
      suppressAutoSelectUntilRef.current = Date.now() + 2500
    }
    map.on('movestart', handleInteraction)
    map.on('dragstart', handleInteraction)
    map.on('zoomstart', handleInteraction)
    return () => {
      map.off('movestart', handleInteraction)
      map.off('dragstart', handleInteraction)
      map.off('zoomstart', handleInteraction)
    }
  }, [map])

  useEffect(() => {
    const intent = viewportIntent()
    // Computed viewport intent
    if (intent.id === lastAppliedIntentIdRef.current) return

    if (intent.type === 'flyTo') {
      // Suppress auto-selection during and immediately after a transition 
      // to avoid competing with manual navigation.
      suppressAutoSelectUntilRef.current = Date.now() + 1500

      const bounds = L.latLng(intent.center).toBounds(200)
      map.fitBounds(bounds, {
        paddingTopLeft: dynamicPaddingTopLeft,
        paddingBottomRight: dynamicPaddingBottomRight,
        maxZoom: intent.zoom,
        animate: true,
        duration: isMobile ? 0.25 : 0.45,
      })

      if (intent.id.startsWith('initial:')) {
        pendingInitialCenterRef.current = null
        pendingInitialZoomRef.current = null
      }
    } else if (intent.type === 'snapTo') {
      suppressAutoSelectUntilRef.current = Date.now() + 800
      
      // Use fitBounds with duration 0 to respect padding for snap commands too
      const bounds = L.latLng(intent.center).toBounds(200)
      map.fitBounds(bounds, {
        paddingTopLeft: dynamicPaddingTopLeft,
        paddingBottomRight: dynamicPaddingBottomRight,
        maxZoom: intent.zoom,
        animate: false
      })

      if (intent.id.startsWith('initial:')) {
        pendingInitialCenterRef.current = null
        pendingInitialZoomRef.current = null
      }
    }

    lastAppliedIntentIdRef.current = intent.id
  }, [viewportIntent, map])

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      map.invalidateSize(false)
    })
    return () => cancelAnimationFrame(frameId)
  }, [map, mapResetToken])

  useEffect(() => {
    const prevZoomRef = { current: map.getZoom() }
    const handleZoomEnd = () => {
      const z = Math.round(map.getZoom() * 10) / 10
      onZoomChange?.(z)
      prevZoomRef.current = z

      // Force bounds check on zoom/pan to prevent escaping geofence
      const center = map.getCenter()
      if (!L.latLngBounds(MAP_MAX_BOUNDS).contains(center)) {
        map.panInsideBounds(MAP_MAX_BOUNDS, { animate: true })
      }
    }
    map.on('zoomend', handleZoomEnd)
    handleZoomEnd()
    return () => { map.off('zoomend', handleZoomEnd) }
  }, [map, onZoomChange])

  useEffect(() => {

    const handleMoveEnd = () => {
      const currentCenter = map.getCenter()
      const z = map.getZoom()

      onMoveEnd?.(Math.round(currentCenter.lat * 10000) / 10000, Math.round(currentCenter.lng * 10000) / 10000)

      // Automated prefetching for visible counties when zoomed in enough.
      // We start prefetching as soon as townships are visible (zoom 10.0).
      if (z >= 10.0 && onHoverCounty) {
        const idsInView: string[] = []
        const currentBounds = map.getBounds()
        
        for (const feature of countyBoundaries.features) {
          try {
            // Check if any part of the county boundary is inside the current viewport
            const countyBounds = L.geoJSON(feature as any).getBounds()
            if (currentBounds.intersects(countyBounds)) {
              idsInView.push(feature.properties.countyId)
            }
          } catch {
            // Fallback to center check if calculation fails
            const center = [feature.properties.centerLatitude, feature.properties.centerLongitude] as [number, number]
            if (currentBounds.contains(center)) {
              idsInView.push(feature.properties.countyId)
            }
          }
        }
        
        // Pass all visible county IDs to trigger loading
        if (idsInView.length > 0) {
          idsInView.forEach(id => onHoverCounty(id))
        }
      }

      // Auto-selection of nearest county has been disabled to prevent disruptive jumping
      // when the user is simply panning across the map.
    }

    map.on('moveend', handleMoveEnd)
    return () => {
      map.off('moveend', handleMoveEnd)
    }
  }, [map, onMoveEnd, countyBoundaries, onHoverCounty])

  return null
}

export default MapBoundsController