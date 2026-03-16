import { useEffect, useMemo, useState } from 'react'
import type { GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { Marker, useMap, useMapEvents } from 'react-leaflet'
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
  selectedTownshipId = null,
}: AllTownshipLabelsProps) {
  const map = useMap()
  const [data, setData] = useState<TownshipCoord[] | null>(null)
  const [, setVersion] = useState(0)

  const townshipBoundsLookup = useMemo(() => {
    if (!townshipBoundaries) return new Map<string, L.LatLngBounds>()
    const lookup = new Map<string, L.LatLngBounds>()
    townshipBoundaries.features.forEach((feature) => {
      const id = feature?.properties?.townId
      if (!id) return
      const bounds = L.geoJSON(feature as GeoJsonObject).getBounds()
      if (bounds.isValid()) lookup.set(id, bounds)
    })
    return lookup
  }, [townshipBoundaries])

  useEffect(() => {
    fetch(buildDataAssetUrl('area-coordinate-lookup.json'))
      .then((res) => res.json())
      .then((json: AreaLookup) => setData(Object.values(json.townships)))
      .catch(() => {})
  }, [])

  useMapEvents({
    moveend: () => setVersion((v) => v + 1),
    zoomend: () => setVersion((v) => v + 1),
  })

  const visible = useMemo(() => {
    if (!data) return []
    const zoom = currentZoom ?? map.getZoom()
    
    // Strict visibility rule: hide if zoom < 11 unless forced. 
    // Also hide if visibleTownshipIds is empty (and not forced).
    if (zoom < 11 && !forceShowAll) return []
    if (visibleTownshipIds.length === 0 && !forceShowAll) return []
    
    const bounds = map.getBounds()
    const visibleIdSet = new Set(visibleTownshipIds)

    // Pad the viewport slightly so that townships whose polygon just barely
    // touches the edge of the view are still treated as "visible".
    const padded = bounds.pad(0.1)

    const inView = data.filter((t) => {
      // Selected township ALWAYS bypasses basic filters if it's in view
      if (t.townId === selectedTownshipId) {
        const padded = bounds.pad(0.2)
        return padded.contains([t.latitude, t.longitude])
      }

      if (t.townId === hiddenTownshipId) return false
      if (visibleIdSet && !visibleIdSet.has(t.townId)) return false

      const townshipBounds = townshipBoundsLookup.get(t.townId)
      if (townshipBounds) {
        return padded.intersects(townshipBounds)
      }

      return padded.contains([t.latitude, t.longitude])
    })

    // Optional deduplication for readability
    if (!forceShowAll && zoom < 12) {
      const accepted: typeof inView = []
      for (const candidate of inView) {
        // Selected township ALWAYS accepted
        if (candidate.townId === selectedTownshipId) {
          accepted.unshift(candidate) // Put it at the start so it can block others but not be blocked
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
  }, [data, hiddenTownshipId, visibleTownshipIds, currentZoom, map.getZoom(), map.getBounds().toBBoxString(), forceShowAll])

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
              click: (e) => {
                L.DomEvent.stopPropagation(e.originalEvent)
                onSelectTownship(t.townId, { skipTabSwitch: true })
              } 
            }}
          />
        )
      })}
    </>
  )
}

export default AllTownshipLabels
