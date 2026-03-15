import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { useMap } from 'react-leaflet'

import type { CountyBoundaryCollection, RegionGroupFilter, TownshipBoundaryCollection } from '../../../data/educationData'
import type { SchoolMapPoint } from '../types'
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
  onZoomChange?: (zoom: number) => void
  onMoveEnd?: (lat: number, lon: number) => void
  initialZoomFromUrl?: number | null
  initialLatFromUrl?: number | null
  initialLonFromUrl?: number | null
  onAutoSelectCounty?: (countyId: string) => void
  onHoverCounty?: (countyId: string | null) => void
}

function MapBoundsController({
  countyBoundaries,
  townshipBoundaries,
  activeCountyId,
  activeTownshipId,
  selectedSchoolPoint,
  activeRegion,
  mapResetToken,
  onZoomChange,
  onMoveEnd,
  onAutoSelectCounty,
  onHoverCounty,
  initialZoomFromUrl = null,
  initialLatFromUrl = null,
  initialLonFromUrl = null,
}: MapBoundsControllerProps) {
  const map = useMap()
  const SIDEBAR_PADDING: L.PointExpression = [0, 0]

  const lastAutoSelectRef = useRef<string | null>(null)
  const hasInitialCenter = initialLatFromUrl != null && initialLonFromUrl != null
  const pendingInitialZoomRef = useRef<number | null>(initialZoomFromUrl)
  const pendingInitialCenterRef = useRef<[number, number] | null>(
    hasInitialCenter ? [initialLatFromUrl, initialLonFromUrl] : null,
  )

  const lastAppliedIntentIdRef = useRef<string>('init')
  const lastAutoSelectAttemptRef = useRef<{ countyId: string | null; time: number | null }>({ countyId: null, time: null })
  const [suppressAutoSelectUntil, setSuppressAutoSelectUntil] = useState(0)
  const prevMapResetTokenRef = useRef(mapResetToken)

  useEffect(() => {
    if (mapResetToken !== prevMapResetTokenRef.current) {
      prevMapResetTokenRef.current = mapResetToken
      setSuppressAutoSelectUntil(Date.now() + AUTO_SELECT_SUPPRESSION_MS)
      lastAutoSelectRef.current = null
      lastAutoSelectAttemptRef.current = { countyId: null, time: null }
    }
  }, [mapResetToken])

  const viewportIntent = useViewportIntent(
    countyBoundaries,
    townshipBoundaries,
    activeCountyId,
    activeTownshipId,
    selectedSchoolPoint,
    activeRegion,
    map.getZoom(),
    lastAppliedIntentIdRef.current,
    pendingInitialCenterRef.current,
    pendingInitialZoomRef.current,
    lastAutoSelectAttemptRef.current,
    mapResetToken
  )

  useEffect(() => {
    const intent = viewportIntent()
    if (intent.id === lastAppliedIntentIdRef.current) return

    if (intent.type === 'flyTo') {
      const bounds = L.latLng(intent.center).toBounds(200)
      map.flyToBounds(bounds, { 
        paddingTopLeft: SIDEBAR_PADDING,
        maxZoom: intent.zoom,
        animate: true, 
        duration: 1.5,
      })

      if (intent.id.startsWith('initial:')) {
        pendingInitialCenterRef.current = null
        pendingInitialZoomRef.current = null
      }
    } else if (intent.type === 'snapTo') {
      map.setView(intent.center, intent.zoom, { animate: false })
      
      if (intent.id.startsWith('initial:')) {
          pendingInitialCenterRef.current = null
          pendingInitialZoomRef.current = null
      }
    }

    lastAppliedIntentIdRef.current = intent.id
  }, [viewportIntent, map, SIDEBAR_PADDING])

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
    }
    map.on('zoomend', handleZoomEnd)
    handleZoomEnd()
    return () => { map.off('zoomend', handleZoomEnd) }
  }, [map, onZoomChange])

  useEffect(() => {
    const handleMoveEnd = () => {
      const c = map.getCenter()
      const b = map.getBounds()
      const z = map.getZoom()
      
      onMoveEnd?.(Math.round(c.lat * 10000) / 10000, Math.round(c.lng * 10000) / 10000)

      // Automated prefetching for visible counties when zoomed in
      if (z >= 11 && onHoverCounty) {
        countyBoundaries.features.forEach(feature => {
            const center = [feature.properties.centerLatitude, feature.properties.centerLongitude] as [number, number]
            if (b.contains(center)) {
               onHoverCounty(feature.properties.countyId)
            }
        })
      }

      if (!activeCountyId && onAutoSelectCounty && Date.now() >= suppressAutoSelectUntil) {
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
    return () => { map.off('moveend', handleMoveEnd) }
  }, [map, onMoveEnd, onAutoSelectCounty, getNearestCountyId, activeCountyId, suppressAutoSelectUntil, countyBoundaries, onHoverCounty])

  return null
}

export default MapBoundsController