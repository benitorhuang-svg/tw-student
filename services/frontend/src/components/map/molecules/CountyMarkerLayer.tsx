import { useEffect, useMemo, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { MAP_DEFAULT_ZOOM, MAP_TOWNSHIP_ZOOM, MAP_MAX_ZOOM } from '../../../lib/constants'
import type { FeatureCollection, GeoJsonObject } from 'geojson'
import { CountyMarker } from '../atoms/CountyMarker'
import type { CountySummary } from '../../../lib/analytics'

interface CountyMarkerLayerProps {
  counties: CountySummary[]
  countyCenterLookup: Map<string, [number, number]>
  countyBoundaries: FeatureCollection
  currentMapZoom: number | null
  activeCountyId: string | null
  onSelectCounty: (countyId: string, options?: { skipTabSwitch?: boolean }) => void
  showMarkers?: boolean
  onHoverCounty: (id: string | null) => void
  showMapTooltip: (latlng: L.LatLng, content: string) => void
  hideMapTooltip: () => void
}

export function CountyMarkerLayer({
  counties,
  countyCenterLookup,
  countyBoundaries,
  currentMapZoom,
  activeCountyId,
  onSelectCounty,
  showMarkers = true,
  onHoverCounty,
  showMapTooltip,
  hideMapTooltip,
}: CountyMarkerLayerProps) {
  const map = useMap()
  const [bounds, setBounds] = useState(map.getBounds())

  const countyBoundsLookup = useMemo(() => {
    const lookup = new Map<string, L.LatLngBounds>()
    try {
      countyBoundaries.features.forEach((feature) => {
        const countyId = feature?.properties?.countyId
        if (!countyId) return
        const bounds = L.geoJSON(feature as GeoJsonObject).getBounds()
        if (bounds.isValid()) lookup.set(countyId, bounds)
      })
    } catch {
      // ignore
    }
    return lookup
  }, [countyBoundaries])

  useEffect(() => {
    const update = () => setBounds(map.getBounds())
    map.on('moveend zoomend', update)
    return () => { map.off('moveend zoomend', update) }
  }, [map])

  const visibleCounties = useMemo(() => {
    const padded = bounds.pad(0.2)

    // Special-case for Chiayi: when either 嘉義市 or 嘉義縣 is active, always show both.
    const isChiayiGroup = activeCountyId === '嘉義市' || activeCountyId === '嘉義縣'

    const inView = counties.filter((county) => {
      if (isChiayiGroup && (county.id === '嘉義市' || county.id === '嘉義縣')) {
        return true
      }

      const center = countyCenterLookup.get(county.id)
      const countyBounds = countyBoundsLookup.get(county.id)
      // Show if either the center is inside view, or any part of the county boundary intersects the view.
      const inViewByCenter = Boolean(center && padded.contains([center[0], center[1]]))
      const inViewByBoundary = Boolean(countyBounds && padded.intersects(countyBounds))
      return inViewByCenter || inViewByBoundary
    })

    // If the viewport doesn't intersect any county (e.g. the user panned into empty sea),
    // show the closest few counties so the user still sees labels for orientation.
    if (inView.length === 0) {
      const mapCenter = map.getCenter()
      const sorted = (
        counties
          .map((county) => {
            const center = countyCenterLookup.get(county.id)
            if (!center) return null
            const dLat = center[0] - mapCenter.lat
            const dLon = center[1] - mapCenter.lng
            return { county, dist: dLat * dLat + dLon * dLon }
          })
          .filter(Boolean) as Array<{ county: CountySummary; dist: number }>
      ).sort((a, b) => a.dist - b.dist)

      return sorted.slice(0, 6).map((item) => item.county)
    }

    return inView
  }, [bounds, counties, countyCenterLookup, countyBoundsLookup, activeCountyId, map])

  const globalPositionOffsets: Record<string, [number, number]> = {
    '嘉市': [0, -0.02],
    '新北市': [0, -0.03],
    '基隆市': [0.02, 0],
    '臺北市': [-0.02, 0.02],
    '嘉縣': [0.05, 0.12],
  }

  const zoomSpecificOffsets: Record<number, Record<string, [number, number]>> = {
    7: {
      '新北': [-0.06, -0.02],
      '基隆': [0, 0.06],
      '臺北': [0.06, -0.06],
      '台北': [0.06, -0.06],
      '嘉縣': [0.05, 0.12],
    },
    8: {
      '嘉市': [0, -0.02],
      '嘉縣': [0.05, 0.12],
    },
    9: {
      '新北': [-0.1, -0.1],
      '基隆': [0, -0.02],
      '臺北': [0.02, -0.02],
      '台北': [0.02, -0.02],
      '嘉縣': [0.05, 0.12],
      '嘉市': [0, -0.02],
    },
    11: {
      '新北': [-0.1, -0.1],
      '基隆': [0, -0.01],
      '臺北': [0.01, -0.01],
      '台北': [0.01, -0.01],
      '嘉縣': [0.05, 0.12],
      '嘉市': [0, -0.02],
    },
  }

  function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t
  }

  function getInterpolatedOffsetsForZoom(zoom: number | null) {
    if (zoom == null) return globalPositionOffsets
    const keys = Object.keys(zoomSpecificOffsets).map(Number).sort((a, b) => a - b)
    if (keys.length === 0) return globalPositionOffsets
    if (zoom <= keys[0]) return zoomSpecificOffsets[keys[0]]
    if (zoom >= keys[keys.length - 1]) return zoomSpecificOffsets[keys[keys.length - 1]]

    let lower = keys[0]
    let upper = keys[keys.length - 1]
    for (let i = 0; i < keys.length - 1; i++) {
      if (zoom >= keys[i] && zoom <= keys[i + 1]) {
        lower = keys[i]
        upper = keys[i + 1]
        break
      }
    }

    const t = (zoom - lower) / (upper - lower)
    const lowerOffsets = lowerSpecificOffsets(lower)
    const upperOffsets = upperSpecificOffsets(upper)
    const result: Record<string, [number, number]> = {}

    const allKeys = new Set<string>([...Object.keys(lowerOffsets), ...Object.keys(upperOffsets)])
    allKeys.forEach((k) => {
      const lo = lowerOffsets[k] ?? globalPositionOffsets[k] ?? [0, 0]
      const hi = upperOffsets[k] ?? globalPositionOffsets[k] ?? [0, 0]
      result[k] = [lerp(lo[0], hi[0], t), lerp(lo[1], hi[1], t)]
    })

    return result

    function lowerSpecificOffsets(l: number) { return zoomSpecificOffsets[l] }
    function upperSpecificOffsets(u: number) { return zoomSpecificOffsets[u] }
  }

  const effectiveOffsets = getInterpolatedOffsetsForZoom(currentMapZoom)

  if (!showMarkers && !activeCountyId) return null

  return (
    <>
      {visibleCounties.map((county) => {
        const center = countyCenterLookup.get(county.id)
        if (!center) return null

        const offset = effectiveOffsets[county.shortLabel] ?? null
        const adjustedCenter: [number, number] = offset ? [center[0] + offset[0], center[1] + offset[1]] : center

        const zoom = currentMapZoom ?? 7;
        const usePill = zoom >= 9.5;
        const isActive = county.id === activeCountyId;
        
        // Pills are smaller, so we keep them interactive even at higher zooms
        const isInteractive = usePill ? true : (zoom < 10.5);
        const opacity = zoom >= 11.5 ? 0.6 : 1.0;

        // When clicking a county marker, zoom directly to township level for clearer drill-in
        const nextZoom = MAP_TOWNSHIP_ZOOM

        return (
          <CountyMarker
            key={`county-marker-${county.id}`}
            county={county}
            position={adjustedCenter}
            isActive={isActive}
            usePill={usePill}
            isInteractive={isInteractive}
            opacity={opacity}
            onSelect={(id) => onSelectCounty(id, { zoom: nextZoom })}
            onHover={onHoverCounty}
            showTooltip={showMapTooltip}
            hideTooltip={hideMapTooltip}
            currentMapZoom={currentMapZoom}
          />
        )
      })}
    </>
  )
}

