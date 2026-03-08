import { useMemo, useState } from 'react'

import { CircleMarker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet'

import type { CountyBucketDataset, SchoolBucketRecord } from '../../data/educationData'
import { formatDelta, formatStudents } from '../../lib/analytics'
import type { SchoolMapPoint } from './types'
import { getSchoolLevelColor, getSchoolLevelLabel } from './schoolMarkerTheme'

function getClusterRadius(count: number, zoom: number) {
  if (count <= 1) {
    return zoom >= 11 ? 7 : 6
  }

  return Math.max(8, Math.min(18, 7 + Math.log2(count) * 2))
}

function getDominantEducationLevel(points: SchoolMapPoint[]) {
  if (points.length === 0) {
    return null
  }

  const levelCounts = new Map<string, number>()
  points.forEach((point) => {
    levelCounts.set(point.educationLevel, (levelCounts.get(point.educationLevel) ?? 0) + 1)
  })

  return [...levelCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
}

type VisibleSchoolMarkersProps = {
  schoolPoints: SchoolMapPoint[]
  countyBuckets: CountyBucketDataset | null
  selectedSchoolId: string | null
  onSelectSchool: (schoolId: string) => void
}

function VisibleSchoolMarkers({
  schoolPoints,
  countyBuckets,
  selectedSchoolId,
  onSelectSchool,
}: VisibleSchoolMarkersProps) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [bounds, setBounds] = useState(() => map.getBounds())

  useMapEvents({
    moveend: () => {
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
    [countyBuckets],
  )
  const schoolLookup = useMemo(() => new Map(schoolPoints.map((point) => [point.id, point])), [schoolPoints])

  const visiblePoints = useMemo(
    () => schoolPoints.filter((point) => bounds.contains([point.latitude, point.longitude])),
    [bounds, schoolPoints],
  )

  const clusteredPoints = useMemo(() => {
    if (zoom >= 11) {
      return visiblePoints.map((point) => ({
        id: point.id,
        count: 1,
        latitude: point.latitude,
        longitude: point.longitude,
        schools: [point],
        dominantEducationLevel: point.educationLevel,
        schoolNames: [point.name],
        geohash: point.id,
      }))
    }

    const precision = zoom >= 10 ? 7 : zoom >= 9 ? 6 : 5
    const candidateBuckets = bucketIndex[precision as 5 | 6 | 7] as SchoolBucketRecord[]

    return candidateBuckets
      .filter((bucket) => {
        return !(
          bucket.bounds.maxLatitude < bounds.getSouth() ||
          bucket.bounds.minLatitude > bounds.getNorth() ||
          bucket.bounds.maxLongitude < bounds.getWest() ||
          bucket.bounds.minLongitude > bounds.getEast()
        )
      })
      .map((bucket) => ({
        id: bucket.id,
        count: bucket.count,
        latitude: bucket.latitude,
        longitude: bucket.longitude,
        schools: bucket.topSchools
          .map((school) => schoolLookup.get(school.id))
          .filter((school): school is SchoolMapPoint => Boolean(school)),
        dominantEducationLevel: getDominantEducationLevel(
          bucket.topSchools
            .map((school) => schoolLookup.get(school.id))
            .filter((school): school is SchoolMapPoint => Boolean(school)),
        ),
        schoolNames: bucket.topSchools.map((school) => school.name),
        geohash: bucket.geohash,
      }))
  }, [bounds, bucketIndex, schoolLookup, visiblePoints, zoom])

  return (
    <>
      {clusteredPoints.map((cluster) => {
        if (cluster.count === 1 && cluster.schools.length === 1) {
          const school = cluster.schools[0]
          const isSelected = school.id === selectedSchoolId
          return (
            <CircleMarker
              key={school.id}
              center={[school.latitude, school.longitude]}
              radius={isSelected ? 9 : Math.max(5, Math.min(10, Math.round(school.currentStudents / 150)))}
              pathOptions={{
                color: isSelected ? '#f8fafc' : '#0f172a',
                weight: isSelected ? 2 : 1,
                fillColor: getSchoolLevelColor(school.educationLevel),
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                click: () => onSelectSchool(school.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {school.name}
              </Tooltip>
              <Popup>
                <div className="atlas-map-popup">
                  <strong>{school.name}</strong>
                  <span>{school.townshipName}</span>
                  <span>{school.educationLevel} / {school.managementType}</span>
                  <span>{formatStudents(school.currentStudents)} 人</span>
                  <span>{formatDelta(school.delta)} 人</span>
                  {school.website ? (
                    <a href={school.website} target="_blank" rel="noreferrer">
                      查看學校資訊
                    </a>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          )
        }

        return (
          <CircleMarker
            key={cluster.id}
            center={[cluster.latitude, cluster.longitude]}
            radius={getClusterRadius(cluster.count, zoom)}
            pathOptions={{
              color: 'rgba(15, 23, 42, 0.78)',
              weight: 1.5,
              fillColor: getSchoolLevelColor(cluster.dominantEducationLevel),
              fillOpacity: 0.82,
            }}
            eventHandlers={{
              click: () => {
                map.flyTo([cluster.latitude, cluster.longitude], Math.min(map.getZoom() + 1, 12), {
                  duration: 0.35,
                })
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              {cluster.count.toLocaleString('zh-TW')} 所學校 · {getSchoolLevelLabel(cluster.dominantEducationLevel)}
            </Tooltip>
            <Popup>
              <div className="atlas-map-popup">
                <strong>{cluster.count} 所學校分群</strong>
                <span>主要學制: {getSchoolLevelLabel(cluster.dominantEducationLevel)}</span>
                <span>點擊圓點可放大到更細的單校層級</span>
                <span>{cluster.schoolNames.slice(0, 3).join('、')}</span>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

export default VisibleSchoolMarkers