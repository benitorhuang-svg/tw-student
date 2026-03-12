import { useEffect, useRef } from 'react'

import type { GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { useMap } from 'react-leaflet'

import type { CountyBoundaryCollection, RegionGroupFilter, TownshipBoundaryCollection } from '../../data/educationData'
import type { SchoolMapPoint } from './types'

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
  initialZoomFromUrl = null,
  initialLatFromUrl = null,
  initialLonFromUrl = null,
}: MapBoundsControllerProps) {
  const map = useMap()
  const lastAutoSelectRef = useRef<string | null>(null)
  const initialAutoSelectDoneRef = useRef(false)
  // When true, the next main-effect run should skip flyTo because the
  // county change originated from auto-select (pan / zoom drill), not
  // from an explicit user click on a county marker.
  const skipNextFlyRef = useRef(false)
  const selectionKey = `${activeRegion}|${activeCountyId ?? ''}|${activeTownshipId ?? ''}|${selectedSchoolPoint?.id ?? ''}`
  const hasInitialCenter = initialLatFromUrl != null && initialLonFromUrl != null
  const pendingInitialZoomRef = useRef<number | null>(initialZoomFromUrl)
  const pendingInitialCenterRef = useRef<[number, number] | null>(
    hasInitialCenter ? [initialLatFromUrl, initialLonFromUrl] : null,
  )
  const restoredInitialViewportKeyRef = useRef<string | null>(hasInitialCenter ? selectionKey : null)

  const getNearestCountyId = (lat: number, lon: number) => {
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
  }

  const invokeAutoSelect = (countyId: string | null) => {
    if (!countyId || !onAutoSelectCounty) return
    // Only select the detected county. The parent orchestration hook
    // already cross-prefetches 嘉義市↔嘉義縣 data, so we no longer
    // force-select both here (doing so caused the last call to win and
    // always fly the map to 嘉義縣 center, kicking the user out of 嘉義市).
    skipNextFlyRef.current = true
    try { onAutoSelectCounty(countyId) } catch (err) { /* swallow */ }
  }

  useEffect(() => {
    map.invalidateSize(false)

    if (pendingInitialCenterRef.current) {
      const targetZoom = pendingInitialZoomRef.current ?? (activeTownshipId ? 12 : townshipBoundaries ? 11 : activeCountyId ? 11 : activeRegion === '全部' ? 7 : 9)
      map.flyTo(pendingInitialCenterRef.current, targetZoom, { duration: 0.7 })
      // Use the initial lat/lon as the primary source of truth for deep-linked map scope.
      if (onAutoSelectCounty) {
        try {
          const nearestCountyId = getNearestCountyId(pendingInitialCenterRef.current[0], pendingInitialCenterRef.current[1])
          if (nearestCountyId && nearestCountyId !== activeCountyId) {
            invokeAutoSelect(nearestCountyId)
            lastAutoSelectRef.current = nearestCountyId
          }
        } catch (err) {
          // ignore geometry errors
        }
      }
      pendingInitialCenterRef.current = null
      pendingInitialZoomRef.current = null
      return
    }

    // If the page was opened with a county specified but township boundaries haven't
    // loaded yet, repeatedly ask the parent to select the county so the township
    // slice is fetched. Retry a few times in case the parent is still initializing.
    if (!initialAutoSelectDoneRef.current && activeCountyId && !townshipBoundaries && onAutoSelectCounty) {
      initialAutoSelectDoneRef.current = true
      let attempts = 0
      const maxAttempts = 6
      const interval = 300
      const id = setInterval(() => {
        attempts += 1
        try {
          invokeAutoSelect(activeCountyId)
        } catch (err) {
          // ignore
        }
        // stop retrying if townshipBoundaries becomes available or attempts exhausted
        if (townshipBoundaries || attempts >= maxAttempts) clearInterval(id)
      }, interval)

      return () => clearInterval(id)
    }

    if (restoredInitialViewportKeyRef.current === selectionKey && mapResetToken === 0) {
      return
    }

    // When the county changed because of auto-select (user panned or
    // zoomed into a new area), do NOT fly the map — the user is already
    // where they want to be. Just clear the flag and bail out.
    if (skipNextFlyRef.current) {
      skipNextFlyRef.current = false
      return
    }

    if (selectedSchoolPoint) {
      map.flyTo([selectedSchoolPoint.latitude, selectedSchoolPoint.longitude], pendingInitialZoomRef.current ?? 15.2, { duration: 0.7 })
      pendingInitialZoomRef.current = null
      restoredInitialViewportKeyRef.current = null
      return
    }

    if (!activeCountyId && !townshipBoundaries && activeRegion === '全部') {
      // Use a fixed default center for the "全台" reset per product requirement
      map.flyTo([24.3713, 119.8777], pendingInitialZoomRef.current ?? 7, {
        duration: 0.7,
      })
      pendingInitialZoomRef.current = null
      return
    }

    const regionFeatures = activeRegion === '全部'
      ? countyBoundaries.features
      : countyBoundaries.features.filter((feature) => feature.properties.region === activeRegion)

    const boundsSource = activeTownshipId && townshipBoundaries
      ? {
          type: 'FeatureCollection' as const,
          features: townshipBoundaries.features.filter((feature) => feature.properties.townId === activeTownshipId),
        }
      : townshipBoundaries
      ? townshipBoundaries
      : activeCountyId
        ? {
            type: 'FeatureCollection' as const,
            features: countyBoundaries.features.filter((feature) => feature.properties.countyId === activeCountyId),
          }
        : {
            type: 'FeatureCollection' as const,
            features: regionFeatures,
          }

    const bounds = L.geoJSON(boundsSource as GeoJsonObject).getBounds()
    if (bounds.isValid()) {
      const targetCenter = bounds.getCenter()
        // When the user explicitly clicks a county marker, zoom to at
        // least 11 so they get a closer view, but never zoom *out* if
        // they are already closer.  For township drill-down use 12.
        const currentZoom = map.getZoom()
        const targetZoom = pendingInitialZoomRef.current ?? (activeTownshipId ? 12 : Math.max(currentZoom, 11))
      map.flyTo(targetCenter, targetZoom, { duration: 0.7 })
      pendingInitialZoomRef.current = null
      restoredInitialViewportKeyRef.current = null
    }
  }, [activeCountyId, activeRegion, activeTownshipId, countyBoundaries, map, mapResetToken, selectedSchoolPoint, selectionKey, townshipBoundaries])

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      map.invalidateSize(false)
    })

    return () => cancelAnimationFrame(frameId)
  }, [map, mapResetToken])

  useEffect(() => {
    const prevZoomRef = { current: map.getZoom() }
    let lastAutoDrill = 0

    const handleZoomEnd = () => {
      const z = Math.round(map.getZoom() * 10) / 10
      onZoomChange?.(z)

      // detect zoom-in crossings and auto-drill when crossing thresholds 10,11,12
      const prev = prevZoomRef.current
      const center = map.getCenter()

      const crossedUp = (threshold: number) => prev < threshold && z >= threshold

      if (crossedUp(10) && lastAutoDrill !== 10) {
        // try to auto-select the county that contains current center so township data loads
        const countyId = getNearestCountyId(center.lat, center.lng)
        if (countyId) {
          // if parent provided a handler, let it select the county (this triggers loading township boundaries)
          if (onAutoSelectCounty) {
            invokeAutoSelect(countyId)
            lastAutoDrill = 10
          } else {
            const found = countyBoundaries.features.find((feature) => feature.properties.countyId === countyId)
            if (!found) return
            const b = L.geoJSON(found).getBounds()
            map.flyTo(b.getCenter(), 10, { duration: 0.5 })
            lastAutoDrill = 10
          }
        }
      } else if (crossedUp(11) && lastAutoDrill !== 11) {
        // if township boundaries are loaded, fly to the township; otherwise, ensure county is selected
        if (townshipBoundaries) {
          const foundTown = townshipBoundaries.features.find((f) => L.geoJSON(f).getBounds().contains(center))
          if (foundTown) {
            const b = L.geoJSON(foundTown).getBounds()
            map.flyTo(b.getCenter(), 11, { duration: 0.5 })
            lastAutoDrill = 11
          }
          } else {
          // ensure county is selected so township slice will be fetched
          const countyId = getNearestCountyId(center.lat, center.lng)
          if (countyId && onAutoSelectCounty) {
            invokeAutoSelect(countyId)
            lastAutoDrill = 11
          }
        }
      } else if (crossedUp(12) && lastAutoDrill !== 12) {
        if (townshipBoundaries) {
          const foundTown = townshipBoundaries.features.find((f) => L.geoJSON(f).getBounds().contains(center))
          if (foundTown) {
            const b = L.geoJSON(foundTown).getBounds()
            map.flyTo(b.getCenter(), 12, { duration: 0.5 })
            lastAutoDrill = 12
          }
        } else {
          const countyId = getNearestCountyId(center.lat, center.lng)
          if (countyId && onAutoSelectCounty) {
            invokeAutoSelect(countyId)
            lastAutoDrill = 12
          }
        }
      }

      prevZoomRef.current = z
    }

    map.on('zoomend', handleZoomEnd)
    handleZoomEnd()
    return () => { map.off('zoomend', handleZoomEnd) }
  }, [map, onZoomChange])

  useEffect(() => {
    const handleMoveEnd = () => {
      const c = map.getCenter()
      onMoveEnd?.(Math.round(c.lat * 10000) / 10000, Math.round(c.lng * 10000) / 10000)
      // If the map center moved into a different county while zoomed-in,
      // request the parent to select that county so township slices load.
      if (onAutoSelectCounty) {
        try {
          const countyId = getNearestCountyId(c.lat, c.lng)
          if (countyId) {
            const currentZoom = Math.round(map.getZoom() * 10) / 10
            if (currentZoom >= 10 && countyId !== activeCountyId && lastAutoSelectRef.current !== countyId) {
              invokeAutoSelect(countyId)
              lastAutoSelectRef.current = countyId
            }
          }
        } catch (err) {
          // swallow geometry errors silently
        }
      }
    }
    map.on('moveend', handleMoveEnd)
    return () => { map.off('moveend', handleMoveEnd) }
  }, [map, onMoveEnd])

  return null
}

export default MapBoundsController