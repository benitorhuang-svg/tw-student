import { useMemo, useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import type { CountyBucketDataset } from '../../../data/educationData'
import type { SchoolMapPoint } from '../types'

export type ClusterPoint = {
  id: string
  count: number
  totalStudents: number
  latitude: number
  longitude: number
  schools: SchoolMapPoint[]
  dominantEducationLevel: string | null
  schoolNames: string[]
  geohash: string
}

export function useSchoolClustering(
  schoolPoints: SchoolMapPoint[],
  countyBuckets: CountyBucketDataset | null
) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [bounds, setBounds] = useState(() => map.getBounds().pad(1.0))

  void countyBuckets

  useMapEvents({
    moveend: () => {
      setZoom(map.getZoom())
      setBounds(map.getBounds())
    },
    zoomend: () => {
      setZoom(map.getZoom())
      setBounds(map.getBounds())
    },
  })

  // Bucket indexing is kept for interface stability but not used
  const visiblePoints = useMemo(
    () => schoolPoints.filter((p) => bounds.contains([p.latitude, p.longitude])),
    [schoolPoints, bounds]
  )

  const clusteredPoints = useMemo(() => {
    // Clustering disabled as per user request: always return individual points
    return visiblePoints.map((point) => ({
      id: point.id,
      count: 1,
      totalStudents: point.currentStudents,
      latitude: point.latitude,
      longitude: point.longitude,
      schools: [point],
      dominantEducationLevel: point.educationLevel,
      schoolNames: [point.name],
      geohash: point.id,
    }))
  }, [visiblePoints])

  return {
    clusteredPoints,
    zoom,
    bounds
  }
}
