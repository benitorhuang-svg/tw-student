import { useEffect, useMemo, useState } from 'react'
import type { GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { Marker, useMap } from 'react-leaflet'
import { loadAreaCoordinateLookup, type TownshipCoordinateLookupEntry } from '@/shared/api/data/sqlite/lookups'

// Import helper for tooltip content
import { buildHoverPreviewHtml } from '../mapStyles'

import type { TownshipBoundaryCollection } from '@/shared/api/data/educationData'
import type { RankingSummary } from '@/shared/lib/analytics'
import { selectMapLabels } from '@/shared/lib/utils/labelLayout'

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

function makeTownshipLabelIcon(name: string, selected: boolean) {
  const width = Math.min(140, 20 + name.length * 14)
  return L.divIcon({
    className: 'atlas-all-township-label-wrapper',
    iconSize: [width, 44],
    iconAnchor: [width / 2, 22],
    html: `<div class="atlas-township-hit-area"><div class="atlas-all-township-label ${selected ? 'atlas-all-township-label--selected' : ''}">${name}</div></div>`,
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
  const [data, setData] = useState<TownshipCoordinateLookupEntry[] | null>(null)
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
    let cancelled = false

    void loadAreaCoordinateLookup()
      .then((lookup) => {
        if (!cancelled) {
          setData(Object.values(lookup.townships))
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
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
    
    // Strict visibility rule: hide if zoom < 10 unless forced. 
    if (zoom < 10) return []
    if (visibleTownshipIds.length === 0) return []
    
    const visibleIdSet = new Set(visibleTownshipIds)
    const renderBounds = bounds

    const inView = data.filter((t) => {
      // Selected township ALWAYS bypasses basic filters if it's in view
      if (t.townId === selectedTownshipId) {
        const padded = renderBounds.pad(0.2)
        return padded.contains([t.latitude, t.longitude])
      }

      if (t.townId === hiddenTownshipId) return false
      if (!visibleIdSet.has(t.townId)) return false

      const townshipBounds = townshipBoundsLookup.get(t.townId)
      if (townshipBounds) {
        return renderBounds.intersects(townshipBounds)
      }

      return renderBounds.contains([t.latitude, t.longitude])
    })

    // Optional deduplication for readability
    if (!forceShowAll) {
      const ids = selectMapLabels(inView.map((township) => {
        const point = map.latLngToContainerPoint([township.latitude, township.longitude])
        return { id: township.townId, x: point.x, y: point.y, width: 20 + township.townName.length * 14,
          height: 44, priority: township.townId === selectedTownshipId ? 1000 : 0 }
      }))
      return inView.filter((township) => ids.has(township.townId))
    }

    return inView
  }, [data, hiddenTownshipId, visibleTownshipIds, currentZoom, bounds, forceShowAll, selectedTownshipId, townshipBoundsLookup, map])

  if (!visible.length) return null

  return (
    <>
      {visible.map((t) => {
        return (
          <Marker
            key={t.townId}
            position={[t.latitude, t.longitude]}
            icon={makeTownshipLabelIcon(t.townName, t.townId === selectedTownshipId)}
            title={t.townName}
            zIndexOffset={t.townId === selectedTownshipId ? 2000 : 700}
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
