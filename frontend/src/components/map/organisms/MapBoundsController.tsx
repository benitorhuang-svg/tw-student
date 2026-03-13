import { useCallback, useEffect, useRef } from 'react'


import L from 'leaflet'
import { useMap } from 'react-leaflet'

import type { CountyBoundaryCollection, RegionGroupFilter, TownshipBoundaryCollection } from '../../../data/educationData'
import type { GeoJsonObject } from 'geojson'
import type { SchoolMapPoint } from '../types'
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_COUNTY_ZOOM,
  MAP_TOWNSHIP_ZOOM,
  MAP_SCHOOL_ZOOM,
  MAP_FOCUS_SCHOOL_ZOOM,
} from '../../../lib/constants'

type MapBoundsControllerProps = {
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  activeCountyId: string | null
  // initial county id parsed from URL/state (might not yet be normalized)
  initialCountyId?: string | null
  activeTownshipId: string | null
  selectedSchoolPoint: SchoolMapPoint | null
  activeRegion: RegionGroupFilter
  mapResetToken: number
  onZoomChange?: (zoom: number) => void
  onMoveEnd?: (lat: number, lon: number) => void
  initialZoomFromUrl?: number | null
  initialLatFromUrl?: number | null
  initialLonFromUrl?: number | null
  // callback invoked by the internal zoom/move handlers when the map
  // enters a new county and the zoom level is below the auto‑select
  // threshold.  optional so callers who have already disabled all
  // auto‑selection can omit it.
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
  const mutableMap = map as unknown as {
    flyTo?: (center: L.LatLngExpression, zoom?: number, options?: L.ZoomPanOptions) => void
    flyToBounds?: (bounds: L.LatLngBoundsExpression, options?: L.FitBoundsOptions) => void
    setView: (center: L.LatLngExpression, zoom: number, options: L.ZoomPanOptions) => void
    fitBounds: (bounds: L.LatLngBoundsExpression, options: L.FitBoundsOptions) => void
    getZoom: () => number
  }

  // Disable animated `flyTo`/`flyToBounds` for this map instance by
  // overriding them to instant `setView`/`fitBounds`.  Restore originals on
  // cleanup.
  useEffect(() => {
    // Preserve originals
    const _origFlyTo = mutableMap.flyTo?.bind(mutableMap)
    const _origFlyToBounds = mutableMap.flyToBounds?.bind(mutableMap)

    // Always convert flyTo/flyToBounds to setView/fitBounds without animation.
    // Removing previous Chiayi-specific conditional so every county behaves
    // consistently and the map doesn't mysteriously ignore programmatic
    // movements.
    /* eslint-disable react-hooks/immutability */
    mutableMap.flyTo = (center: L.LatLngExpression, zoom?: number, options?: L.ZoomPanOptions) => {
      return mutableMap.setView(center, zoom ?? mutableMap.getZoom(), { ...(options ?? {}), animate: false })
    }

    mutableMap.flyToBounds = (bounds: L.LatLngBoundsExpression, options?: L.FitBoundsOptions) => {
      return mutableMap.fitBounds(bounds, { ...(options ?? {}), animate: false })
    }
    /* eslint-enable react-hooks/immutability */

    return () => {
      if (_origFlyTo) {
        mutableMap.flyTo = _origFlyTo
      }
      if (_origFlyToBounds) {
        mutableMap.flyToBounds = _origFlyToBounds
      }
    }
  }, [mutableMap])
  // When true, the next main-effect run should skip flyTo because the
  // county change originated from auto-drill.  (flag is occasionally used
  // elsewhere for logic, so keep it.)
  const skipNextFlyRef = useRef(false)
  const lastAutoSelectRef = useRef<string | null>(null)
  // When no selection has changed, avoid recentering the map even if
  // the parent component re-renders.  this prevents the "invisible boundary"
  // that dragged users back to the county centre.
  const prevSelectionKeyRef = useRef<string>(`${activeRegion}|${activeCountyId ?? ''}|${activeTownshipId ?? ''}|${selectedSchoolPoint?.id ?? ''}`)
  const prevActiveCountyIdRef = useRef<string | null>(activeCountyId)
  const prevResetTokenRef = useRef(mapResetToken)
  const suppressAutoSelectUntilRef = useRef(0)

  // Support for mapResetToken has been removed; breadcrumb reset now merely
  // clears selection without touching the viewport.
  const selectionKey = `${activeRegion}|${activeCountyId ?? ''}|${activeTownshipId ?? ''}|${selectedSchoolPoint?.id ?? ''}`
  const hasInitialCenter = initialLatFromUrl != null && initialLonFromUrl != null
  const pendingInitialZoomRef = useRef<number | null>(initialZoomFromUrl)
  const pendingInitialCenterRef = useRef<[number, number] | null>(
    hasInitialCenter ? [initialLatFromUrl, initialLonFromUrl] : null,
  )
  const restoredInitialViewportKeyRef = useRef<string | null>(hasInitialCenter ? selectionKey : null)


  // auto-select removed; keep stub so other code can compile if referenced

  useEffect(() => {
    map.invalidateSize(false)

    // If the URL specified a zoom level but not a center, apply it once on
    // startup and then forget it.  This allows deep links like `?zoom=10&county=...`
    // to correctly zoom without needing a lat/lon.
    if (pendingInitialZoomRef.current != null && !pendingInitialCenterRef.current) {
      const targetZoom = pendingInitialZoomRef.current
      if (map.getZoom() !== targetZoom) {
        map.setView(map.getCenter(), targetZoom, { animate: false })
      }
      pendingInitialZoomRef.current = null
    }

    // bail out early if nothing that should move the viewport has changed
    // and we have no pending initial positioning info.
    if (!pendingInitialCenterRef.current &&
        pendingInitialZoomRef.current == null &&
        prevSelectionKeyRef.current === selectionKey &&
        prevResetTokenRef.current === mapResetToken) {
      return
    }
    // Determine whether the user just selected a new county via click.
    const prevCountyId = prevActiveCountyIdRef.current
    const countyJustSelected = activeCountyId && activeCountyId !== prevCountyId
    // Keep the ref in sync for future renders.
    prevActiveCountyIdRef.current = activeCountyId

    // update the stored key now that we've noticed a change
    prevSelectionKeyRef.current = selectionKey

    // previously we auto‑recentered the map when the reset token changed;
    // the UX is better if we simply clear selection and leave the viewport alone.
    // therefore this branch has been removed.

    if (pendingInitialCenterRef.current) {
      const targetZoom = pendingInitialZoomRef.current ?? (activeTownshipId ? MAP_SCHOOL_ZOOM : townshipBoundaries ? MAP_TOWNSHIP_ZOOM : activeCountyId ? MAP_TOWNSHIP_ZOOM : activeRegion === '全部' ? MAP_DEFAULT_ZOOM : 9)
      map.setView(pendingInitialCenterRef.current, targetZoom, { animate: false })
      // Use the initial lat/lon as the primary source of truth for deep-linked map scope.
      // only auto‑select a county if the URL did *not* already specify one
      // (initialCountyId / activeCountyId non‑null means the user chose
      // explicitly).  previously we would still auto‑select the nearest county
      // even when a county param was present, which caused temporary flicker
      // when the lat/lon was near a border (see zoom=10/11 reports).
      // auto-select disabled: do nothing here
      pendingInitialCenterRef.current = null
      pendingInitialZoomRef.current = null
      return
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

    // When the user clicks a county marker, zoom to county level and center on it.
    // Do not override URL-driven initial positions (pendingInitialCenterRef) or
    // when the user has selected a township/school.
    if (countyJustSelected && !pendingInitialCenterRef.current && pendingInitialZoomRef.current == null && !activeTownshipId && !selectedSchoolPoint) {
      const countyFeature = countyBoundaries.features.find((feature) => feature.properties.countyId === activeCountyId)
      if (countyFeature) {
        map.setView(
          [countyFeature.properties.centerLatitude, countyFeature.properties.centerLongitude],
          MAP_COUNTY_ZOOM,
          { animate: false },
        )
        return
      }
    }

    if (selectedSchoolPoint) {
      map.setView([selectedSchoolPoint.latitude, selectedSchoolPoint.longitude], pendingInitialZoomRef.current ?? MAP_FOCUS_SCHOOL_ZOOM, { animate: false })
      pendingInitialZoomRef.current = null
      restoredInitialViewportKeyRef.current = null
      return
    }

    if (!activeCountyId && activeRegion === '全部') {
      // Suppress auto-select during intentional resets so that the
      // moveend/zoomend handlers don't immediately re-select a county.
      // Use a 2-second window to survive across React render cycles.
      if (mapResetToken !== prevResetTokenRef.current) {
        suppressAutoSelectUntilRef.current = Date.now() + 2000
        lastAutoSelectRef.current = null
        prevResetTokenRef.current = mapResetToken

        // Use a fixed default center for the "全台" reset per product requirement
        map.setView(MAP_DEFAULT_CENTER, pendingInitialZoomRef.current ?? MAP_DEFAULT_ZOOM, { animate: false })
        pendingInitialZoomRef.current = null
      }

      // Do NOT re-center the map when the user merely toggles the selected
      // county off (second click) — this prevents unwanted zooming out.
      return
    }

    // If a township is selected, center the map on that township without
    // changing zoom. This preserves the user's current zoom level while still
    // focusing the view on the selected area.
    if (
      activeTownshipId &&
      townshipBoundaries &&
      !pendingInitialCenterRef.current &&
      pendingInitialZoomRef.current == null
    ) {
      const townshipFeature = townshipBoundaries.features.find(
        (f) => f.properties?.townId === activeTownshipId,
      )
      if (townshipFeature) {
        const bounds = L.geoJSON(townshipFeature as GeoJsonObject).getBounds()
        if (bounds.isValid()) {
          const center = bounds.getCenter()
          map.setView([center.lat, center.lng], map.getZoom(), { animate: false })
        }
      }
    }

    // Otherwise, keep the current map viewport. We do not auto-pan when selecting
    // a county/township to avoid the map "jumping" around (Google Maps style).
    pendingInitialZoomRef.current = null
    restoredInitialViewportKeyRef.current = null
    return
  }, [activeCountyId, activeRegion, activeTownshipId, countyBoundaries, map, mapResetToken, selectedSchoolPoint, selectionKey, townshipBoundaries])

  // helper: compute nearest county to given coordinates
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
    let lastAutoDrill = 0

    const handleZoomEnd = () => {
      const z = Math.round(map.getZoom() * 10) / 10
      onZoomChange?.(z)


      // detect zoom-in crossings and auto-drill when crossing thresholds 10,11,12
      const prev = prevZoomRef.current

      const crossedUp = (threshold: number) => prev < threshold && z >= threshold

      // auto-drill removed; we no longer trigger selections on zoom thresholds
      // but we still keep the `lastAutoDrill` mechanism as a no-op to avoid
      // runtime errors.
      if (crossedUp(10) && lastAutoDrill !== 10) { lastAutoDrill = 10 }
      else if (crossedUp(11) && lastAutoDrill !== 11) { lastAutoDrill = 11 }
      else if (crossedUp(12) && lastAutoDrill !== 12) { lastAutoDrill = 12 }

      prevZoomRef.current = z
    }

    map.on('zoomend', handleZoomEnd)
    handleZoomEnd()
    return () => { map.off('zoomend', handleZoomEnd) }
  }, [map, onZoomChange, onAutoSelectCounty])

  useEffect(() => {
    const handleMoveEnd = () => {
      const c = map.getCenter()
      onMoveEnd?.(Math.round(c.lat * 10000) / 10000, Math.round(c.lng * 10000) / 10000)

      // Only auto-select a county when none is currently selected.
      // This avoids “jumping” the active county when the user pans the map,
      // while still allowing initial viewport sync.
      if (!activeCountyId && onAutoSelectCounty && Date.now() >= suppressAutoSelectUntilRef.current) {
        try {
          const countyId = getNearestCountyId(c.lat, c.lng)
          if (countyId && countyId !== lastAutoSelectRef.current) {
            onAutoSelectCounty(countyId)
            lastAutoSelectRef.current = countyId
          }
        } catch {
          /* swallow */
        }
      }
    }
    map.on('moveend', handleMoveEnd)
    return () => { map.off('moveend', handleMoveEnd) }
  }, [map, onMoveEnd, onAutoSelectCounty, getNearestCountyId, activeCountyId])

  return null
}

export default MapBoundsController