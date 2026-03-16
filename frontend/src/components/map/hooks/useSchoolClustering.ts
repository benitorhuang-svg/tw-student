import { useMemo, useState, useRef } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import type { CountyBucketDataset, SchoolBucketRecord } from '../../../data/educationData'
import type { SchoolMapPoint } from '../types'
import { getDominantEducationLevel } from '../utils/clusterHelpers'

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
  const renderedBoundsRef = useRef<L.LatLngBounds>(map.getBounds().pad(1.0))
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [bounds, setBounds] = useState(() => renderedBoundsRef.current)

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

  const bucketIndex = useMemo(
    () => ({
      5: countyBuckets?.precisions['5'] ?? [],
      6: countyBuckets?.precisions['6'] ?? [],
      7: countyBuckets?.precisions['7'] ?? [],
    }),
    [countyBuckets]
  )

  const visiblePoints = useMemo(
    () => schoolPoints.filter((p) => bounds.contains([p.latitude, p.longitude])),
    [schoolPoints, bounds]
  )

  const clusteredPoints = useMemo(() => {
    // High zoom: no clustering
    if (zoom >= 12) {
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
    }

    // Optimized thresholds for better clustering:
    // Zoom 12+: Details (Precision 7)
    // Zoom 11: District level (Precision 6)
    // Zoom 10: County level (Precision 5)
    // Zoom < 10: National level (Precision 5)
    
    // Density Guard: If too many points are visible, force coarser clustering regardless of zoom
    const isOvercrowded = visiblePoints.length > 300
    
    let precision: number
    if (isOvercrowded) {
      precision = zoom >= 11 ? 5 : 4
    } else {
      precision = zoom >= 13 ? 7 : zoom >= 11 ? 6 : 5
    }

    // Geohash precision 4 is not in our default bucket index usually, 
    // but the data structure should handle it or fall back. 
    // Our bucketIndex only has 5, 6, 7.
    const safePrecision = Math.max(5, Math.min(7, precision)) as 5 | 6 | 7
    const candidateBuckets = bucketIndex[safePrecision] as SchoolBucketRecord[]

    // No buckets: manual clustering (returning all as individual points for now if no buckets)
    if (candidateBuckets.length === 0) {
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
    }

    return candidateBuckets
      .filter((bucket) => {
        return !(
          bucket.bounds.maxLatitude < bounds.getSouth() ||
          bucket.bounds.minLatitude > bounds.getNorth() ||
          bucket.bounds.maxLongitude < bounds.getWest() ||
          bucket.bounds.minLongitude > bounds.getEast()
        )
      })
      .map((bucket) => {
        const scopedSchools = visiblePoints.filter(
          (point) =>
            point.latitude >= bucket.bounds.minLatitude &&
            point.latitude <= bucket.bounds.maxLatitude &&
            point.longitude >= bucket.bounds.minLongitude &&
            point.longitude <= bucket.bounds.maxLongitude,
        )

        if (scopedSchools.length === 0) return null

        const schoolNames = [...scopedSchools]
          .sort((left, right) => right.currentStudents - left.currentStudents)
          .map((school) => school.name)

        return {
          id: `${bucket.id}-${bucket.geohash}`,
          count: scopedSchools.length,
          totalStudents: scopedSchools.reduce((sum, school) => sum + school.currentStudents, 0),
          latitude: bucket.latitude,
          longitude: bucket.longitude,
          schools: scopedSchools,
          dominantEducationLevel: getDominantEducationLevel(scopedSchools),
          schoolNames,
          geohash: bucket.geohash,
        }
      })
      .filter((cluster): cluster is ClusterPoint => Boolean(cluster))
  }, [bounds, bucketIndex, visiblePoints, zoom])

  return {
    clusteredPoints,
    zoom,
    bounds
  }
}
