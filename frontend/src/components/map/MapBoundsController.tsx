import { useEffect } from 'react'

import type { GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { useMap } from 'react-leaflet'

import type { CountyBoundaryCollection, TownshipBoundaryCollection } from '../../data/educationData'

const TAIWAN_MAIN_BOUNDS = L.latLngBounds(
  L.latLng(21.82, 119.95),
  L.latLng(25.4, 122.2),
)

type MapBoundsControllerProps = {
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  activeCountyId: string | null
  mapResetToken: number
}

function MapBoundsController({
  countyBoundaries,
  townshipBoundaries,
  activeCountyId,
  mapResetToken,
}: MapBoundsControllerProps) {
  const map = useMap()

  useEffect(() => {
    if (!activeCountyId && !townshipBoundaries) {
      map.flyToBounds(TAIWAN_MAIN_BOUNDS, {
        padding: [18, 18],
        duration: 0.7,
        maxZoom: 8,
      })
      return
    }

    const boundsSource = townshipBoundaries
      ? townshipBoundaries
      : activeCountyId
        ? {
            type: 'FeatureCollection' as const,
            features: countyBoundaries.features.filter((feature) => feature.properties.countyId === activeCountyId),
          }
        : countyBoundaries

    const bounds = L.geoJSON(boundsSource as GeoJsonObject).getBounds()
    if (bounds.isValid()) {
      map.flyToBounds(bounds, {
        padding: [22, 22],
        duration: 0.7,
        maxZoom: townshipBoundaries ? 11 : activeCountyId ? 9 : 8,
      })
    }
  }, [activeCountyId, countyBoundaries, map, mapResetToken, townshipBoundaries])

  return null
}

export default MapBoundsController