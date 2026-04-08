import { useMemo, useState } from 'react'
import type { BBox } from 'geojson'
import Supercluster from 'supercluster'
import { useMap, useMapEvents } from 'react-leaflet'
import type { CountyBucketDataset } from '../../../data/educationData'
import type { SchoolMapPoint } from '../types'

export type ClusterPoint = {
  id: string
  count: number
  totalStudents: number
  latitude: number
  longitude: number
  dominantEducationLevel: string | null
  schools: SchoolMapPoint[]
  clusterId?: number
  expansionZoom?: number
}

type IndexedSchoolProperties = {
  school: SchoolMapPoint
  totalStudents: number
  levelCounts: Record<string, number>
}

type ClusterAggregation = {
  totalStudents: number
  levelCounts: Record<string, number>
}

const CLUSTER_PADDING = 0.35
const CLUSTER_MIN_ZOOM = 7
const CLUSTER_MAX_ZOOM = 13
const CLUSTER_RADIUS = 64

function buildFeature(point: SchoolMapPoint): Supercluster.PointFeature<IndexedSchoolProperties> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [point.longitude, point.latitude],
    },
    properties: {
      school: point,
      totalStudents: Math.max(point.currentStudents, 0),
      levelCounts: point.educationLevel ? { [point.educationLevel]: 1 } : {},
    },
  }
}

function toBbox(bounds: {
  getSouthWest: () => { lng: number; lat: number }
  getNorthEast: () => { lng: number; lat: number }
}): BBox {
  const southWest = bounds.getSouthWest()
  const northEast = bounds.getNorthEast()
  return [southWest.lng, southWest.lat, northEast.lng, northEast.lat]
}

function getDominantEducationLevelFromCounts(levelCounts: Record<string, number>) {
  let dominantLevel: string | null = null
  let dominantCount = 0

  for (const [educationLevel, count] of Object.entries(levelCounts)) {
    if (count > dominantCount) {
      dominantCount = count
      dominantLevel = educationLevel
    }
  }

  return dominantLevel
}

function isClusterFeature(
  feature: Supercluster.ClusterFeature<ClusterAggregation> | Supercluster.PointFeature<IndexedSchoolProperties>,
): feature is Supercluster.ClusterFeature<ClusterAggregation> {
  return 'cluster' in feature.properties && feature.properties.cluster === true
}

export function useSchoolClustering(
  schoolPoints: SchoolMapPoint[],
  countyBuckets: CountyBucketDataset | null
) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [bounds, setBounds] = useState(() => map.getBounds().pad(CLUSTER_PADDING))

  void countyBuckets

  const clusterIndex = useMemo(() => {
    const index = new Supercluster<IndexedSchoolProperties, ClusterAggregation>({
      minZoom: CLUSTER_MIN_ZOOM,
      maxZoom: CLUSTER_MAX_ZOOM,
      minPoints: 2,
      radius: CLUSTER_RADIUS,
      map: (properties) => ({
        totalStudents: properties.totalStudents,
        levelCounts: { ...properties.levelCounts },
      }),
      reduce: (accumulated, properties) => {
        accumulated.totalStudents += properties.totalStudents
        for (const [educationLevel, count] of Object.entries(properties.levelCounts)) {
          accumulated.levelCounts[educationLevel] = (accumulated.levelCounts[educationLevel] ?? 0) + count
        }
      },
    })

    index.load(
      schoolPoints
        .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
        .map(buildFeature),
    )

    return index
  }, [schoolPoints])

  useMapEvents({
    moveend: () => {
      setZoom(map.getZoom())
      setBounds(map.getBounds().pad(CLUSTER_PADDING))
    },
    zoomend: () => {
      setZoom(map.getZoom())
      setBounds(map.getBounds().pad(CLUSTER_PADDING))
    },
  })

  const clusteredPoints = useMemo(() => {
    const clusters = clusterIndex.getClusters(toBbox(bounds), Math.round(zoom))

    return clusters.map((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates

      if (isClusterFeature(feature)) {
        const properties = feature.properties
        return {
          id: `cluster-${properties.cluster_id}`,
          count: properties.point_count,
          totalStudents: properties.totalStudents,
          latitude,
          longitude,
          schools: [],
          dominantEducationLevel: getDominantEducationLevelFromCounts(properties.levelCounts),
          clusterId: properties.cluster_id,
          expansionZoom: clusterIndex.getClusterExpansionZoom(properties.cluster_id),
        }
      }

      const properties = feature.properties

      return {
        id: properties.school.id,
        count: 1,
        totalStudents: properties.school.currentStudents,
        latitude,
        longitude,
        schools: [properties.school],
        dominantEducationLevel: properties.school.educationLevel,
      }
    })
  }, [bounds, clusterIndex, zoom])

  return {
    clusteredPoints,
    zoom,
    bounds
  }
}
