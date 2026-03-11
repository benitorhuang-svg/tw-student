import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { buildDataAssetUrl } from '../../data/dataAsset'

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

type AllTownshipLabelsProps = {
  onSelectTownship: (townshipId: string) => void
  hiddenTownshipId?: string | null
  visibleTownshipIds?: string[]
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

function AllTownshipLabels({ onSelectTownship, hiddenTownshipId = null, visibleTownshipIds = [] }: AllTownshipLabelsProps) {
  const map = useMap()
  const [data, setData] = useState<TownshipCoord[] | null>(null)
  const [, setVersion] = useState(0)

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
    const zoom = map.getZoom()
    if (zoom < 10) return []
    const bounds = map.getBounds()
    const visibleIdSet = visibleTownshipIds.length > 0 ? new Set(visibleTownshipIds) : null

    const inView = data.filter((t) => t.townId !== hiddenTownshipId && bounds.contains([t.latitude, t.longitude]) && (visibleIdSet ? visibleIdSet.has(t.townId) : true))

    // collision-based de-duplication at lower zooms
    if (zoom < 12) {
      const accepted: typeof inView = []
      for (const candidate of inView) {
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
  }, [data, hiddenTownshipId, visibleTownshipIds, map.getZoom(), map.getBounds().toBBoxString()])

  if (!visible.length) return null

  return (
    <>
      {visible.map((t) => (
        <Marker
          key={t.townId}
          position={[t.latitude, t.longitude]}
          icon={makeTownshipLabelIcon(t.townName)}
          eventHandlers={{ click: () => onSelectTownship(t.townId) }}
        >
          <Tooltip direction="top" offset={[0, -8]} className="atlas-map-tooltip">
            {t.countyName} {t.townName}
          </Tooltip>
        </Marker>
      ))}
    </>
  )
}

export default AllTownshipLabels
