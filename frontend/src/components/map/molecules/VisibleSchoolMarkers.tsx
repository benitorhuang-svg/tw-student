import { useCallback, useMemo, useRef } from 'react'
import { useMapEvents } from 'react-leaflet'
import type { CountyBucketDataset } from '../../../data/educationData'
import type { SchoolMapPoint } from '../types'
import { useSchoolClustering } from '../hooks/useSchoolClustering'
import { SchoolMarker } from '../atoms/SchoolMarker'
import { ClusterMarker } from '../atoms/ClusterMarker'

type VisibleSchoolMarkersProps = {
  schoolPoints: SchoolMapPoint[]
  countyBuckets: CountyBucketDataset | null
  selectedSchoolId: string | null
  highlightedSchoolId?: string | null
  onSelectSchool: (schoolId: string | null) => void
}

function VisibleSchoolMarkers({
  schoolPoints,
  countyBuckets,
  selectedSchoolId,
  highlightedSchoolId = null,
  onSelectSchool,
}: VisibleSchoolMarkersProps) {
  const suppressNextMapClearRef = useRef(false)
  const stableSelectSchool = useCallback((id: string | null) => onSelectSchool(id), [onSelectSchool])

  const { clusteredPoints, zoom } = useSchoolClustering(schoolPoints, countyBuckets)

  const maxStudentsInView = useMemo(
    () => Math.max(...clusteredPoints.map((c) => c.totalStudents), 1000),
    [clusteredPoints]
  )

  useMapEvents({
    click: () => {
      if (suppressNextMapClearRef.current) {
        suppressNextMapClearRef.current = false
        return
      }
      stableSelectSchool(null)
    }
  })

  // Sort clustered points:
  // 1. Primary: Put selected school on top (rendered last)
  // 2. Secondary: Larger schools (by student count) on top to emphasize significance
  const sortedClusteredPoints = useMemo(() => {
    return [...clusteredPoints].sort((a, b) => {
      // Check if either cluster contains the selected school
      const aHasSelected = a.schools?.some(s => s.id === selectedSchoolId) ? 1 : 0
      const bHasSelected = b.schools?.some(s => s.id === selectedSchoolId) ? 1 : 0
      
      if (aHasSelected !== bHasSelected) {
        return aHasSelected - bHasSelected // Selected on top
      }
      
      // Secondary sort: Larger school count or larger student volume
      return a.totalStudents - b.totalStudents
    })
  }, [clusteredPoints, selectedSchoolId])

  return (
    <>
      {sortedClusteredPoints.map((cluster) => {
        // Individual school markers
        if (cluster.count === 1 && cluster.schools.length === 1) {
          const school = cluster.schools[0]
          return (
            <SchoolMarker
              key={`school-${school.id}`}
              school={school}
              zoom={zoom}
              isSelected={school.id === selectedSchoolId}
              isHighlighted={school.id === highlightedSchoolId}
              onSelect={stableSelectSchool}
              suppressNextMapClearRef={suppressNextMapClearRef}
            />
          )
        }

        // Clustered markers
        return (
          <ClusterMarker
            key={`cluster-${cluster.id}`}
            cluster={cluster}
            maxStudentsInView={maxStudentsInView}
            zoom={zoom}
          />
        )
      })}
    </>
  )
}

export default VisibleSchoolMarkers