import { useCallback, useEffect, useRef } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'

import type { CountyBoundaryCollection, RegionGroupFilter, TownshipBoundaryCollection } from '../../../data/educationData'
import type { SchoolMapPoint } from '../types'
import { MAP_MAX_BOUNDS } from '../../../lib/constants'
import { MAP_TOWNSHIP_FOCUS_ZOOM } from '../../../lib/constants'
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
  onAutoSelectCounty?: (countyId: string) => void
  onHoverCounty?: (countyId: string | null) => void
  currentMapZoom?: number | null
  activeTab: string
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
  onAutoSelectCounty,
  onHoverCounty,
  currentMapZoom = null,
  initialZoomFromUrl = null,
  initialLatFromUrl = null,
  initialLonFromUrl = null,
  activeTab,
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
    mapResetToken
  )

  useEffect(() => {
    const intent = viewportIntent()
    // Computed viewport intent
    if (intent.id === lastAppliedIntentIdRef.current) return

    if (intent.type === 'flyTo') {
      const bounds = L.latLng(intent.center).toBounds(200)
      map.flyToBounds(bounds, {
        paddingTopLeft: dynamicPaddingTopLeft,
        paddingBottomRight: dynamicPaddingBottomRight,
        maxZoom: intent.zoom,
        animate: true,
        duration: 0.8,
      })

      if (intent.id.startsWith('initial:')) {
        pendingInitialCenterRef.current = null
        pendingInitialZoomRef.current = null
      }
    } else if (intent.type === 'snapTo') {
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

  const getNearestCountyId = useCallback((lat: number, lon: number) => {
    let bestCountyId: string | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (const feature of countyBoundaries.features) {
      const dLat = feature.properties.centerLatitude - lat
      const dLon = feature.properties.centerLongitude - lon
      const distance = dLat * dLat + dLon * dLon
      if (distance < bestDistance) {
        bestDistance = distance
        bestCountyId = feature.properties.countyId
      }
    }
    return bestCountyId
  }, [countyBoundaries])

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
    const idleHandleRef = { id: 0 as number | null }

    const schedulePrefetch = (ids: string[]) => {
      // Cancel any pending idle callback
      if ((idleHandleRef.id as any) != null) {
        try {
          ;(window as any).cancelIdleCallback?.(idleHandleRef.id)
        } catch {
          clearTimeout(idleHandleRef.id as any)
        }
        idleHandleRef.id = null
      }

      const cb = () => {
        // Limit concurrent prefetches to a small number to avoid overload
        const max = 6
        // derive viewport tuple [minLat, minLng, maxLat, maxLng]
        for (const id of ids.slice(0, max)) {
          try { onHoverCounty?.(id) } catch { /* ignore */ }
        }
      }

      if ((window as any).requestIdleCallback) {
        idleHandleRef.id = (window as any).requestIdleCallback(cb, { timeout: 1000 })
      } else {
        // Fallback to timeout
        idleHandleRef.id = window.setTimeout(cb, 200)
      }
    }

    const handleMoveEnd = () => {
      const c = map.getCenter()
      const b = map.getBounds()
      const z = map.getZoom()

      onMoveEnd?.(Math.round(c.lat * 10000) / 10000, Math.round(c.lng * 10000) / 10000)

      // Automated prefetching for visible counties when zoomed in enough.
      // Use a higher zoom threshold and schedule prefetch work during idle
      // periods to avoid blocking the main thread.
      if (z >= MAP_TOWNSHIP_FOCUS_ZOOM && onHoverCounty) {
        const idsInView: string[] = []
        for (const feature of countyBoundaries.features) {
          const center = [feature.properties.centerLatitude, feature.properties.centerLongitude] as [number, number]
          if (b.contains(center)) {
            idsInView.push(feature.properties.countyId)
          }
        }
        if (idsInView.length > 0) schedulePrefetch(idsInView)
      }

      if (activeTab !== 'overview' && !activeCountyId && onAutoSelectCounty && Date.now() >= suppressAutoSelectUntilRef.current) {
        try {
          const countyId = getNearestCountyId(c.lat, c.lng)
          if (countyId && countyId !== lastAutoSelectRef.current) {
            lastAutoSelectRef.current = countyId
            lastAutoSelectAttemptRef.current = { countyId, time: Date.now() }
            onAutoSelectCounty(countyId)
          }
        } catch { /* ... */ }
      }
    }

    map.on('moveend', handleMoveEnd)
    return () => {
      map.off('moveend', handleMoveEnd)
      if ((idleHandleRef.id as any) != null) {
        try { ;(window as any).cancelIdleCallback?.(idleHandleRef.id) } catch { clearTimeout(idleHandleRef.id as any) }
      }
    }
  }, [map, onMoveEnd, onAutoSelectCounty, getNearestCountyId, activeTab, activeCountyId, countyBoundaries, onHoverCounty])

  return null
}

export default MapBoundsController