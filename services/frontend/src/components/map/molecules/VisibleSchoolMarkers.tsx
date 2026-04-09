import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import type { CountyBucketDataset } from '../../../data/educationData'
import type { SchoolMapPoint } from '../types'
import { SchoolMarker } from '../atoms/SchoolMarker'

type VisibleSchoolMarkersProps = {
  schoolPoints: SchoolMapPoint[]
  countyBuckets: CountyBucketDataset | null
  selectedSchoolId: string | null
  highlightedSchoolId?: string | null
  onSelectSchool: (schoolId: string | null) => void
}

const VisibleSchoolMarkers = memo(function VisibleSchoolMarkers({
  schoolPoints,
  countyBuckets: _countyBuckets,
  selectedSchoolId,
  highlightedSchoolId = null,
  onSelectSchool,
}: VisibleSchoolMarkersProps) {
  const suppressNextMapClearRef = useRef(false)
  const stableSelectSchool = useCallback((id: string | null) => onSelectSchool(id), [onSelectSchool])

  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [bounds, setBounds] = useState(() => map.getBounds())

  useMapEvents({
    click: () => {
      if (suppressNextMapClearRef.current) {
        suppressNextMapClearRef.current = false
        return
      }
      stableSelectSchool(null)
    },
    move: () => {
      setZoom(map.getZoom())
      setBounds(map.getBounds())
    },
    moveend: () => {
      setZoom(map.getZoom())
      setBounds(map.getBounds())
    },
    zoomend: () => {
      setZoom(map.getZoom())
      setBounds(map.getBounds())
    },
  })

  // Limit markers to those within the current viewport to avoid rendering large
  // numbers of markers off-screen which can cause long main-thread work.
  const visibleSchoolPoints = useMemo(() => {
    try {
      const pad = bounds.pad(0.5)
      return schoolPoints.filter((s) => pad.contains([s.latitude, s.longitude]))
    } catch {
      return schoolPoints
    }
  }, [schoolPoints, bounds])



  const sortedSchoolPoints = useMemo(() => {
    return [...visibleSchoolPoints].sort((a, b) => {
      const aHasSelected = a.id === selectedSchoolId ? 1 : 0
      const bHasSelected = b.id === selectedSchoolId ? 1 : 0

      if (aHasSelected !== bHasSelected) {
        return aHasSelected - bHasSelected
      }

      return (a.currentStudents ?? 0) - (b.currentStudents ?? 0)
    })
  }, [visibleSchoolPoints, selectedSchoolId])

  return (
    <>
      {sortedSchoolPoints.map((school) => (
        <SchoolMarker
          key={`school-${school.id}`}
          school={school}
          zoom={zoom}
          isSelected={school.id === selectedSchoolId}
          isHighlighted={school.id === highlightedSchoolId}
          onSelect={stableSelectSchool}
          suppressNextMapClearRef={suppressNextMapClearRef}
        />
      ))}
    </>
  )
})

export default VisibleSchoolMarkers