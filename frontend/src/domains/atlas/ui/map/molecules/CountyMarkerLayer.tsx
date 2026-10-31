import { useEffect, useMemo, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'


import type { FeatureCollection, GeoJsonObject } from 'geojson'
import { CountyMarker } from '../atoms/CountyMarker'
import type { CountySummary } from '@/shared/lib/analytics'
import { selectMapLabels } from '@/shared/lib/utils/labelLayout'

interface CountyMarkerLayerProps {
  counties: CountySummary[]
  countyCenterLookup: Map<string, [number, number]>
  countyBoundaries: FeatureCollection
  currentMapZoom: number | null
  activeCountyId: string | null
  onSelectCounty: (countyId: string, options?: { skipTabSwitch?: boolean }) => void
  showMarkers?: boolean
  showAllLabels?: boolean
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
  showAllLabels = false,
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

  const displayedCounties = useMemo(() => {
    const candidates = showMarkers ? visibleCounties : visibleCounties.filter((county) => county.id === activeCountyId)
    if (showAllLabels || (currentMapZoom ?? 7) < 9) return candidates
    const pairedChiayi = activeCountyId === '嘉義市' || activeCountyId === '嘉義縣'
    const ids = selectMapLabels(candidates.flatMap((county) => {
      const center = countyCenterLookup.get(county.id)
      if (!center) return []
      const point = map.latLngToContainerPoint(center)
      const selected = county.id === activeCountyId
      const protectedPair = pairedChiayi && (county.id === '嘉義市' || county.id === '嘉義縣')
      const fullName = selected || (currentMapZoom ?? 7) >= 10
      return [{ id: county.id, x: point.x, y: point.y, width: fullName ? 14 + county.name.length * 12 : 44, height: 44,
        priority: selected || protectedPair ? 1000 : county.region === '離島' ? 100 : county.students / 10000 }]
    }))
    return candidates.filter((county) => ids.has(county.id))
  }, [visibleCounties, showMarkers, showAllLabels, activeCountyId, countyCenterLookup, currentMapZoom, map])

  if (!showMarkers && !activeCountyId) return null

  return (
    <>
      {displayedCounties.map((county) => {
        const center = countyCenterLookup.get(county.id)
        if (!center) return null

        if (isNaN(center[0]) || isNaN(center[1])) {
          console.error('NaN DETECTED:', { countyId: county.id, center });
        }

        const zoom = currentMapZoom ?? 7;
        const isActive = county.id === activeCountyId;
        const isInteractive = true;
        const opacity = zoom >= 11.5 ? 0.75 : 1.0;

        return (
          <CountyMarker
            key={`county-marker-${county.id}`}
            county={county}
            position={center}
            isActive={isActive}
            showFullName={showAllLabels}
            isInteractive={isInteractive}
            opacity={opacity}
            onSelect={(id) => onSelectCounty(id, { skipTabSwitch: false })}
            onHover={onHoverCounty}
            showTooltip={showMapTooltip}
            hideTooltip={hideMapTooltip}
            currentMapZoom={currentMapZoom ?? undefined}
          />
        )
      })}
    </>
  )
}

