import { useEffect, useRef } from 'react'

import type { GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { useMap } from 'react-leaflet'

import type { CountyBoundaryCollection, RegionGroupFilter, TownshipBoundaryCollection } from '../../data/educationData'
import type { SchoolMapPoint } from './types'

const TAIWAN_MAIN_BOUNDS = L.latLngBounds(
  L.latLng(21.82, 119.95),
  L.latLng(25.4, 122.2),
)

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
  initialZoomFromUrl = null,
  initialLatFromUrl = null,
  initialLonFromUrl = null,
}: MapBoundsControllerProps) {
  const map = useMap()
  const selectionKey = `${activeRegion}|${activeCountyId ?? ''}|${activeTownshipId ?? ''}|${selectedSchoolPoint?.id ?? ''}`
  const hasInitialCenter = initialLatFromUrl != null && initialLonFromUrl != null
  const pendingInitialZoomRef = useRef<number | null>(initialZoomFromUrl)
  const pendingInitialCenterRef = useRef<[number, number] | null>(
    hasInitialCenter ? [initialLatFromUrl, initialLonFromUrl] : null,
  )
  const restoredInitialViewportKeyRef = useRef<string | null>(hasInitialCenter ? selectionKey : null)

  useEffect(() => {
    map.invalidateSize(false)

    if (pendingInitialCenterRef.current) {
      const targetZoom = pendingInitialZoomRef.current ?? (activeTownshipId ? 12 : townshipBoundaries ? 11 : activeCountyId ? 11 : activeRegion === '全部' ? 7.4 : 9)
      map.flyTo(pendingInitialCenterRef.current, targetZoom, { duration: 0.7 })
      pendingInitialCenterRef.current = null
      pendingInitialZoomRef.current = null
      return
    }

    if (restoredInitialViewportKeyRef.current === selectionKey && mapResetToken === 0) {
      return
    }

    if (selectedSchoolPoint) {
      map.flyTo([selectedSchoolPoint.latitude, selectedSchoolPoint.longitude], pendingInitialZoomRef.current ?? 15.2, { duration: 0.7 })
      pendingInitialZoomRef.current = null
      restoredInitialViewportKeyRef.current = null
      return
    }

    if (!activeCountyId && !townshipBoundaries && activeRegion === '全部') {
      map.flyTo(TAIWAN_MAIN_BOUNDS.getCenter(), pendingInitialZoomRef.current ?? 7.4, {
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
      const targetZoom = pendingInitialZoomRef.current ?? (activeTownshipId ? 12 : townshipBoundaries ? 11 : activeCountyId ? 11 : 9)
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
    const handleZoomEnd = () => onZoomChange?.(Math.round(map.getZoom() * 10) / 10)
    map.on('zoomend', handleZoomEnd)
    handleZoomEnd()
    return () => { map.off('zoomend', handleZoomEnd) }
  }, [map, onZoomChange])

  useEffect(() => {
    const handleMoveEnd = () => {
      const c = map.getCenter()
      onMoveEnd?.(Math.round(c.lat * 10000) / 10000, Math.round(c.lng * 10000) / 10000)
    }
    map.on('moveend', handleMoveEnd)
    return () => { map.off('moveend', handleMoveEnd) }
  }, [map, onMoveEnd])

  return null
}

export default MapBoundsController