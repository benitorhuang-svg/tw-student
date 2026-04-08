import { useCallback } from 'react'
import L from 'leaflet'
import type { GeoJsonObject } from 'geojson'
import type { MutableRefObject } from 'react'
import type { 
  CountyBoundaryCollection, 
  RegionGroupFilter, 
  TownshipBoundaryCollection 
} from '../../../data/educationData'
import type { SchoolMapPoint } from '../types'
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_COUNTY_ZOOM,
  MAP_TOWNSHIP_ZOOM,
  MAP_TOWNSHIP_FOCUS_ZOOM,
  MAP_MAX_ZOOM,
  MAP_FOCUS_SCHOOL_ZOOM,
} from '../../../lib/constants'

export type ViewportIntent = 
  | { id: string; type: 'flyTo'; center: [number, number]; zoom: number }
  | { id: string; type: 'snapTo'; center: [number, number]; zoom: number }
  | { id: string; type: 'noop' }

export function useViewportIntent(
  countyBoundaries: CountyBoundaryCollection,
  townshipBoundaries: TownshipBoundaryCollection | null,
  activeCountyId: string | null,
  activeTownshipId: string | null,
  selectedSchoolPoint: SchoolMapPoint | null,
  activeRegion: RegionGroupFilter,
  currentZoom: number,
  requestedZoom: number | null,
  lastAppliedIntentIdRef: MutableRefObject<string>,
  pendingInitialCenterRef: MutableRefObject<[number, number] | null>,
  pendingInitialZoomRef: MutableRefObject<number | null>,
  lastAutoSelectAttemptRef: MutableRefObject<{ countyId: string | null; time: number | null }>,
  mapResetToken: number
) {
  const AUTO_SELECT_DETECTION_WINDOW_MS = 1500

  return useCallback((): ViewportIntent => {
    const pendingInitialCenter = pendingInitialCenterRef.current
    const pendingInitialZoom = pendingInitialZoomRef.current
    const lastAutoSelectAttempt = lastAutoSelectAttemptRef.current

    if (pendingInitialCenter) {
      const center = pendingInitialCenter
      const zoom =
        pendingInitialZoom ??
        (activeTownshipId
          ? MAP_MAX_ZOOM
          : townshipBoundaries
          ? MAP_TOWNSHIP_ZOOM
          : activeCountyId
          ? MAP_TOWNSHIP_ZOOM
          : activeRegion === '全部'
          ? MAP_DEFAULT_ZOOM
          : 9)

      return {
        id: `initial:${center[0]}:${center[1]}:${zoom}`,
        type: 'flyTo',
        center,
        zoom,
      }
    }

    if (selectedSchoolPoint) {
        const zoom = requestedZoom ?? pendingInitialZoom ?? MAP_FOCUS_SCHOOL_ZOOM
        const id = `school:${selectedSchoolPoint.id}:${zoom}`
        return {
          id,
          type: 'flyTo',
          center: [selectedSchoolPoint.latitude, selectedSchoolPoint.longitude],
          zoom,
        }
    }

    if (activeTownshipId && townshipBoundaries) {
      const townshipFeature = townshipBoundaries.features.find(
        (f) => f.properties?.townId === activeTownshipId,
      )
      if (townshipFeature) {
        const bounds = L.geoJSON(townshipFeature as GeoJsonObject).getBounds()
        if (bounds.isValid()) {
          const center = bounds.getCenter()
          const zoom = requestedZoom ?? Math.max(currentZoom, MAP_TOWNSHIP_FOCUS_ZOOM)
          const id = `township:${activeTownshipId}:${zoom}`
          return {
            id,
            type: 'flyTo',
            center: [center.lat, center.lng],
            zoom,
          }
        }
      }
    }

    if (activeCountyId) {
      const now = Date.now()
      const autoSelectedRecently =
        lastAutoSelectAttempt.countyId === activeCountyId &&
        lastAutoSelectAttempt.time != null &&
        now - lastAutoSelectAttempt.time < AUTO_SELECT_DETECTION_WINDOW_MS

      const countyFeature = countyBoundaries.features.find(
        (feature) => feature.properties.countyId === activeCountyId,
      )

      // If the county was auto-selected recently, preserve the noop behavior to
      // avoid disturbing implicit navigation. Otherwise compute the intended
      // zoom and include it in the intent id so repeated selections with a
      // different zoom still produce a flyTo.
      if (autoSelectedRecently) {
        const zoom = requestedZoom ?? MAP_COUNTY_ZOOM
        const id = `county:${activeCountyId}:${zoom}`
        return { id, type: 'noop' }
      }

      if (countyFeature) {
        const zoom = requestedZoom ?? MAP_COUNTY_ZOOM
        const id = `county:${activeCountyId}:${zoom}`
        return {
          id,
          type: 'flyTo',
          center: [countyFeature.properties.centerLatitude, countyFeature.properties.centerLongitude],
          zoom,
        }
      }
    }

    if (!activeCountyId && !activeTownshipId && !selectedSchoolPoint && activeRegion === '全部') {
      return {
        id: `national:${mapResetToken}`,
        type: 'flyTo',
        center: MAP_DEFAULT_CENTER,
        zoom: MAP_DEFAULT_ZOOM,
      }
    }

    return { id: lastAppliedIntentIdRef.current, type: 'noop' }
  }, [
    activeCountyId,
    activeRegion,
    activeTownshipId,
    countyBoundaries,
    currentZoom,
    requestedZoom,
    selectedSchoolPoint,
    townshipBoundaries,
    lastAppliedIntentIdRef,
    pendingInitialCenterRef,
    pendingInitialZoomRef,
    lastAutoSelectAttemptRef,
    mapResetToken
  ])
}
