import { useEffect, useMemo, useState } from 'react'
import type { GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { Marker, useMap } from 'react-leaflet'
import { buildDataAssetUrl } from '../../../data/dataAsset'

type TownshipCoord = {
  countyId: string
  countyName: string
  townId: string
  townName: string
  region: string
  longitude: number
  latitude: number
}

// Import helper for tooltip content
import { buildHoverPreviewHtml } from '../mapStyles'

type AreaLookup = {
  townships: Record<string, TownshipCoord>
}

import type { TownshipBoundaryCollection } from '../../../data/educationData'
import type { RankingSummary } from '../../../lib/analytics'

type AllTownshipLabelsProps = {
  onSelectTownship: (townshipId: string, options?: { skipTabSwitch?: boolean }) => void
  hiddenTownshipId?: string | null
  visibleTownshipIds?: string[]
  forceShowAll?: boolean
  townshipBoundaries?: TownshipBoundaryCollection | null
  currentZoom?: number | null
  townshipLookup?: Map<string, RankingSummary>
  selectedTownshipId?: string | null
  showMapTooltip?: (latlng: L.LatLng, content: string) => void
  hideMapTooltip?: () => void
}

function makeTownshipLabelIcon(name: string) {
  const width = Math.min(140, 20 + name.length * 14)
  return L.divIcon({
    className: 'atlas-all-township-label-wrapper',
    iconSize: [width, 24],
    iconAnchor: [width / 2, 12],
    html: `<div class="atlas-all-township-label">${name}</div>`,
  })
}

function AllTownshipLabels({
  onSelectTownship,
  hiddenTownshipId = null,
  visibleTownshipIds = [],
  forceShowAll = false,
  townshipBoundaries = null,
  currentZoom = null,
  townshipLookup = new Map(),
  selectedTownshipId = null,
  showMapTooltip,
  hideMapTooltip,
}: AllTownshipLabelsProps) {
  const map = useMap()
  const [data, setData] = useState<TownshipCoord[] | null>(null)
  const [, setVersion] = useState(0)
  const [bounds, setBounds] = useState(() => map.getBounds())

  const townshipBoundsLookup = useMemo(() => {
    if (!townshipBoundaries) return new Map<string, L.LatLngBounds>()
    const lookup = new Map<string, L.LatLngBounds>()
    townshipBoundaries.features.forEach((feature) => {
      const id = feature?.properties?.townId
      if (!id) return
      const b = L.geoJSON(feature as GeoJsonObject).getBounds()
      if (b.isValid()) lookup.set(id, b)
    })
    return lookup
  }, [townshipBoundaries])

  useEffect(() => {
    fetch(buildDataAssetUrl('area-coordinate-lookup.json'))
      .then((res) => res.json())
      .then((json: AreaLookup) => setData(Object.values(json.townships)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = () => {
      setBounds(map.getBounds())
      setVersion((v) => v + 1)
    }
    map.on('moveend', handler)
    map.on('zoomend', handler)
    return () => {
      map.off('moveend', handler)
      map.off('zoomend', handler)
    }
  }, [map])

  const visible = useMemo(() => {
    if (!data) return []
    const zoom = currentZoom ?? map.getZoom()
    
    // Strict visibility rule: hide if zoom < 11 unless forced. 
    if (zoom < 11 && !forceShowAll) return []
    if (visibleTownshipIds.length === 0 && !forceShowAll) return []
    
    const visibleIdSet = new Set(visibleTownshipIds)
    const renderBounds = bounds

    const inView = data.filter((t) => {
      // Selected township ALWAYS bypasses basic filters if it's in view
      if (t.townId === selectedTownshipId) {
        const padded = renderBounds.pad(0.2)
        return padded.contains([t.latitude, t.longitude])
      }

      if (t.townId === hiddenTownshipId) return false
      if (visibleIdSet && !visibleIdSet.has(t.townId)) return false

      const townshipBounds = townshipBoundsLookup.get(t.townId)
      if (townshipBounds) {
        return renderBounds.intersects(townshipBounds)
      }

      return renderBounds.contains([t.latitude, t.longitude])
    })

    // Optional deduplication for readability
    if (!forceShowAll && zoom < 12) {
      const accepted: typeof inView = []
      for (const candidate of inView) {
        // Selected township ALWAYS accepted
        if (candidate.townId === selectedTownshipId) {
          accepted.unshift(candidate) 
          continue
        }

        const pt = map.latLngToContainerPoint([candidate.latitude, candidate.longitude])
        const overlaps = accepted.some((existing) => {
          const ept = map.latLngToContainerPoint([existing.latitude, existing.longitude])
          return Math.abs(pt.x - ept.x) < 60 && Math.abs(pt.y - ept.y) < 20
        })
        if (!overlaps) accepted.push(candidate)
      }
      return accepted
    }

    return inView
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, hiddenTownshipId, visibleTownshipIds, currentZoom, bounds, forceShowAll])

  if (!visible.length) return null

  return (
    <>
      {visible.map((t) => {
        return (
          <Marker
            key={t.townId}
            position={[t.latitude, t.longitude]}
            icon={makeTownshipLabelIcon(t.townName)}
            eventHandlers={{ 
              click: (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e.originalEvent)
                onSelectTownship(t.townId, { skipTabSwitch: true })
              },
              mouseover: (e: L.LeafletMouseEvent) => {
                if (showMapTooltip && townshipLookup) {
                  const summary = townshipLookup.get(t.townId)
                  if (summary) {
                    showMapTooltip(e.latlng, buildHoverPreviewHtml(summary.label, summary.students))
                  }
                }
              },
              mouseout: () => {
                if (hideMapTooltip) {
                  hideMapTooltip()
                }
              }
            }}
          />
        )
      })}
    </>
  )
}

export default AllTownshipLabels
