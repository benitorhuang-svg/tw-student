import { useState } from 'react'
import { Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { RankingSummary } from '../../lib/analytics'
import { growthChoroplethColor, renderHoverPreview, renderScopeMarkerIcon } from './mapStyles'

type TownshipDotMarkersProps = {
  townshipRows: RankingSummary[]
  activeTownshipId: string | null
  townshipCenterLookup: Map<string, [number, number]>
  onSelectTownship: (townshipId: string) => void
  variant?: 'compact' | 'full'
}

function getTownshipCollisionBox(label: string, variant: 'compact' | 'full', zoom: number) {
  const width = variant === 'compact'
    ? Math.min(88, 26 + label.length * 13)
    : Math.min(148, 40 + label.length * 15)
  const height = variant === 'compact'
    ? (zoom >= 12 ? 22 : 20)
    : (zoom >= 12 ? 32 : 28)

  return { width, height }
}

function TownshipDotMarkers({ townshipRows, activeTownshipId, townshipCenterLookup, onSelectTownship, variant = 'compact' }: TownshipDotMarkersProps) {
  const map = useMap()
  const [, setViewportVersion] = useState(0)

  useMapEvents({
    moveend: () => setViewportVersion((value) => value + 1),
    zoomend: () => setViewportVersion((value) => value + 1),
  })

  const zoom = map.getZoom()
  const baseRows = townshipRows
    .filter((township) => township.id !== activeTownshipId)
    .map((township) => {
      const center = townshipCenterLookup.get(township.id)
      if (!center) return null
      const point = map.latLngToContainerPoint(center)
      return { township, center, point, ...getTownshipCollisionBox(township.label, variant, zoom) }
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

  const visibleTownships = zoom < 11
    ? baseRows.sort((left, right) => right.township.students - left.township.students)
    : (() => {
        const accepted: typeof baseRows = []
        for (const candidate of [...baseRows].sort((left, right) => right.township.students - left.township.students)) {
          const overlaps = accepted.some((existing) => {
            const xGap = Math.abs(candidate.point.x - existing.point.x)
            const yGap = Math.abs(candidate.point.y - existing.point.y)
            return xGap < (candidate.width + existing.width) / 2 && yGap < (candidate.height + existing.height) / 2
          })

          if (!overlaps) {
            accepted.push(candidate)
          }
        }

        return accepted
      })()

  return (
    <>
      {visibleTownships.map(({ township, center }) => {
          return (
            <Marker
              key={`township-label-${township.id}`}
              position={center}
              icon={renderScopeMarkerIcon(township.label, 0, growthChoroplethColor(township.deltaRatio), variant === 'compact' ? 24 : 32, 'township', variant === 'compact')}
              eventHandlers={{ click: () => onSelectTownship(township.id) }}
            >
              <Tooltip direction="top" offset={[0, variant === 'compact' ? -6 : -10]} className="atlas-map-tooltip atlas-map-tooltip--preview">
                {renderHoverPreview(township.label)}
              </Tooltip>
            </Marker>
          )
        })}
    </>
  )
}

export default TownshipDotMarkers
