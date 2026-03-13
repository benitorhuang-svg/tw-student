import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import L from 'leaflet'
import { CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'

import type { CountyBucketDataset, SchoolBucketRecord } from '../../../data/educationData'
import { formatStudents } from '../../../lib/analytics'
import type { SchoolMapPoint } from '../types'
import { growthChoroplethColor, growthChoroplethOpacity } from '../mapStyles'
import { getSchoolLevelColor } from '../schoolMarkerTheme'

function renderSchoolHoverCard(school: SchoolMapPoint) {
  return (
    <div className="atlas-map-hover-card atlas-map-hover-card--school atlas-map-hover-card--name-only">
      <strong>{school.name}</strong>
    </div>
  )
}

function renderClusterHoverCard(count: number) {
  return (
    <div className="atlas-map-hover-card atlas-map-hover-card--school atlas-map-hover-card--name-only">
      <strong>{count.toLocaleString('zh-TW')} 所學校分群</strong>
    </div>
  )
}

function getClusterRadius(count: number, totalStudents: number, maxStudents: number, zoom: number) {
  const studentScale = Math.max(0.24, totalStudents / maxStudents)

  if (count <= 1) {
    return Math.max(6, Math.min(12, (zoom >= 11 ? 7 : zoom >= 10 ? 8 : 10) + studentScale * 2))
  }

  const baseSize = zoom >= 11 ? 8 : zoom >= 10 ? 12 : 16
  return Math.max(baseSize + studentScale * 2, Math.min(34, baseSize + Math.log2(count) * 2 + studentScale * 12))
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
  highlightedSchoolId?: string | null
  onSelectSchool: (schoolId: string | null) => void
}

type AccessibleCircleMarkerProps = {
  ariaLabel: string
  center: [number, number]
  isPressed?: boolean
  onActivate: () => void
  pathOptions: L.PathOptions
  radius: number
  tooltipContent: ReactNode
}

function AccessibleCircleMarker({
  ariaLabel,
  center,
  isPressed = false,
  onActivate,
  pathOptions,
  radius,
  tooltipContent,
}: AccessibleCircleMarkerProps) {
  const markerRef = useRef<L.CircleMarker | null>(null)

  useEffect(() => {
    const marker = markerRef.current
    if (!marker) {
      return
    }

    let frameId = 0
    let element: SVGElement | null = null

    const attachAccessibility = () => {
      element = marker.getElement() as SVGElement | null
      if (!element) {
        frameId = window.requestAnimationFrame(attachAccessibility)
        return
      }

      element.setAttribute('tabindex', '0')
      element.setAttribute('role', 'button')
      element.setAttribute('aria-label', ariaLabel)
      if (isPressed) {
        element.setAttribute('aria-pressed', 'true')
      } else {
        element.removeAttribute('aria-pressed')
      }

      const handleFocus = () => marker.openTooltip()
      const handleBlur = () => marker.closeTooltip()
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          marker.openTooltip()
          onActivate()
        }

        if (event.key === 'Escape') {
          marker.closeTooltip()
        }
      }

      element.addEventListener('focus', handleFocus)
      element.addEventListener('blur', handleBlur)
      element.addEventListener('keydown', handleKeyDown)

      return () => {
        element?.removeEventListener('focus', handleFocus)
        element?.removeEventListener('blur', handleBlur)
        element?.removeEventListener('keydown', handleKeyDown)
      }
    }

    const cleanup = attachAccessibility()

    return () => {
      window.cancelAnimationFrame(frameId)
      cleanup?.()
    }
  }, [ariaLabel, isPressed, onActivate])

  return (
    <CircleMarker
      ref={markerRef}
      center={center}
      radius={radius}
      pathOptions={pathOptions}
      eventHandlers={{
        click: (event) => {
          L.DomEvent.stopPropagation(event.originalEvent)
          markerRef.current?.openTooltip()
          onActivate()
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -6]} className="atlas-map-tooltip atlas-map-tooltip--preview">
        {tooltipContent}
      </Tooltip>
    </CircleMarker>
  )
}

function VisibleSchoolMarkers({
  schoolPoints,
  countyBuckets,
  selectedSchoolId,
  highlightedSchoolId = null,
  onSelectSchool,
}: VisibleSchoolMarkersProps) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [bounds, setBounds] = useState(() => map.getBounds())
  const suppressNextMapClearRef = useRef(false)

  const stableSelectSchool = useCallback((id: string | null) => onSelectSchool(id), [onSelectSchool])

  useMapEvents({
    click: () => {
      if (suppressNextMapClearRef.current) {
        suppressNextMapClearRef.current = false
        return
      }
      stableSelectSchool(null)
    },
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
  const visiblePoints = useMemo(
    () => schoolPoints.filter((point) => bounds.contains([point.latitude, point.longitude])),
    [bounds, schoolPoints],
  )

  const clusteredPoints = useMemo(() => {
    if (zoom >= 11) {
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

    const precision = zoom >= 10 ? 7 : zoom >= 9 ? 6 : 5
    const candidateBuckets = bucketIndex[precision as 5 | 6 | 7] as SchoolBucketRecord[]

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

        if (scopedSchools.length === 0) {
          return null
        }

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
      .filter((cluster): cluster is NonNullable<typeof cluster> => Boolean(cluster))
  }, [bounds, bucketIndex, visiblePoints, zoom])
  const maxClusterStudents = useMemo(
    () => Math.max(...clusteredPoints.map((cluster) => cluster.totalStudents), 1),
    [clusteredPoints],
  )

  return (
    <>
      {clusteredPoints.map((cluster) => {
        if (cluster.count === 1 && cluster.schools.length === 1) {
          const school = cluster.schools[0]
          const isSelected = school.id === selectedSchoolId
          const isHighlighted = school.id === highlightedSchoolId
          const baseRadius = isSelected ? 8 : isHighlighted ? 7 : Math.max(5, Math.min(10, Math.round(school.currentStudents / 150)))
          const absPct = Math.abs(school.deltaRatio * 100)
          const hasGlow = absPct >= 5
          const glowColor = school.deltaRatio >= 0 ? '#22c55e' : '#ef4444'

          return [
            hasGlow ? (
              <CircleMarker
                key={`glow-${school.id}`}
                center={[school.latitude, school.longitude]}
                radius={baseRadius + Math.min(14, 4 + absPct * 0.4)}
                pathOptions={{ color: glowColor, weight: 0, fillColor: glowColor, fillOpacity: Math.min(0.13, 0.04 + absPct * 0.003) }}
                interactive={false}
              />
            ) : null,
            <AccessibleCircleMarker
              key={`school-${school.id}`}
              ariaLabel={`${school.name}，${school.townshipName}，${school.educationLevel}，${formatStudents(school.currentStudents)} 人，按 Enter 查看學校分析`}
              center={[school.latitude, school.longitude]}
              isPressed={isSelected}
              radius={baseRadius}
              pathOptions={{
                className: `atlas-school-marker atlas-school-marker-${school.id}`,
                color: isSelected || isHighlighted ? '#f8fafc' : '#0f172a',
                weight: isSelected ? 2.5 : isHighlighted ? 2 : 1,
                fillColor: growthChoroplethColor(school.deltaRatio),
                fillOpacity: isHighlighted ? 0.94 : Math.max(0.58, growthChoroplethOpacity(school.deltaRatio) + 0.12),
              }}
              onActivate={() => {
                suppressNextMapClearRef.current = true
                stableSelectSchool(school.id)
              }}
              tooltipContent={renderSchoolHoverCard(school)}
            />,
          ]
        }

        return (
          <AccessibleCircleMarker
            key={cluster.id}
            ariaLabel={`${cluster.count.toLocaleString('zh-TW')} 所學校分群，學生總量 ${formatStudents(cluster.totalStudents)} 人，按 Enter 放大地圖`}
            center={[cluster.latitude, cluster.longitude]}
            radius={getClusterRadius(cluster.count, cluster.totalStudents, maxClusterStudents, zoom)}
            pathOptions={{
              className: 'atlas-school-cluster-marker',
              color: 'rgba(15, 23, 42, 0.78)',
              weight: 1.5,
              fillColor: getSchoolLevelColor(cluster.dominantEducationLevel),
              fillOpacity: Math.max(0.7, Math.min(0.94, cluster.totalStudents / maxClusterStudents)),
            }}
            onActivate={() => {
              suppressNextMapClearRef.current = true
              map.setView([cluster.latitude, cluster.longitude], Math.min(map.getZoom() + 1, 12), { animate: false })
            }}
            tooltipContent={renderClusterHoverCard(cluster.count)}
          />
        )
      })}
    </>
  )
}

export default VisibleSchoolMarkers