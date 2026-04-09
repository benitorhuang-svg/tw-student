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
  mapResetToken: number,
  isMobile: boolean = false
) {
  const AUTO_SELECT_DETECTION_WINDOW_MS = 3000

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
        const id = `school:${selectedSchoolPoint.id}:${requestedZoom ?? 'auto'}:${mapResetToken}`
        const lat = isMobile ? selectedSchoolPoint.latitude - 0.01 : selectedSchoolPoint.latitude
        const lng = selectedSchoolPoint.longitude

        return {
          id,
          type: 'flyTo',
          center: [lat, lng],
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
          const id = `township:${activeTownshipId}:${requestedZoom ?? 'auto'}:${mapResetToken}`
          const offsetLat = isMobile ? center.lat - 0.02 : center.lat
          const finalCenter = [offsetLat, center.lng]

          return {
            id,
            type: 'flyTo',
            center: finalCenter as [number, number],
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
        const id = `county:${activeCountyId}:${requestedZoom ?? 'auto'}:${mapResetToken}`
        const centerLat = isMobile ? countyFeature.properties.centerLatitude - 0.1 : countyFeature.properties.centerLatitude
        const centerLng = countyFeature.properties.centerLongitude
        
        return {
          id,
          type: 'flyTo',
          center: [centerLat, centerLng],
          zoom,
        }
      }
    }

    if (!activeCountyId && !activeTownshipId && !selectedSchoolPoint && activeRegion === '全部') {
      // On mobile, shifting the default center slightly west ensures Kinmen/Matsu 
      // are not obscured by the left controls/edges. We also shift the center North
      // (+0.5 latitude) so that the map content visually shifts down.
      const nationalCenter: [number, number] = isMobile 
        ? [MAP_DEFAULT_CENTER[0] - 0.8, MAP_DEFAULT_CENTER[1] ] 
        : MAP_DEFAULT_CENTER

      return {
        id: `national:${mapResetToken}`,
        type: 'flyTo',
        center: nationalCenter,
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
    mapResetToken,
    isMobile
  ])
}
