import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import type { CountyBucketDataset } from '@/shared/api/data/educationData'
import type { SchoolMapPoint } from '../types'
import { SchoolMarker } from '../atoms/SchoolMarker'

const SCHOOL_MARKER_PANE = 'school-marker-pane'
const SCHOOL_INTERACTION_PANE = 'school-interaction-pane'

type VisibleSchoolMarkersProps = {
  schoolPoints: SchoolMapPoint[]
  countyBuckets: CountyBucketDataset | null
  selectedSchoolId: string | null
  highlightedSchoolId?: string | null
  onSelectSchool: (schoolId: string | null) => void
}

const VisibleSchoolMarkers = memo(function VisibleSchoolMarkers({
  schoolPoints,
  selectedSchoolId,
  highlightedSchoolId = null,
  onSelectSchool,
}: VisibleSchoolMarkersProps) {
  const suppressNextMapClearRef = useRef(false)
  const stableSelectSchool = useCallback((id: string | null) => onSelectSchool(id), [onSelectSchool])

  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [bounds, setBounds] = useState(() => map.getBounds())
  const [areSchoolPanesReady, setAreSchoolPanesReady] = useState(() =>
    Boolean(map.getPane(SCHOOL_MARKER_PANE) && map.getPane(SCHOOL_INTERACTION_PANE)),
  )

  useEffect(() => {
    if (!map.getPane(SCHOOL_MARKER_PANE)) {
      map.createPane(SCHOOL_MARKER_PANE).style.zIndex = '550'
    }
    if (!map.getPane(SCHOOL_INTERACTION_PANE)) {
      map.createPane(SCHOOL_INTERACTION_PANE).style.zIndex = '650'
    }
    setAreSchoolPanesReady(true)
  }, [map])

  useMapEvents({
    click: () => {
      if (suppressNextMapClearRef.current) {
        suppressNextMapClearRef.current = false
        return
      }
      stableSelectSchool(null)
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
      {areSchoolPanesReady && sortedSchoolPoints.map((school) => (
        <SchoolMarker
          key={`school-${school.id}`}
          school={school}
          zoom={zoom}
          isSelected={school.id === selectedSchoolId}
          isHighlighted={school.id === highlightedSchoolId}
          onSelect={stableSelectSchool}
          pane={SCHOOL_MARKER_PANE}
          interactionPane={SCHOOL_INTERACTION_PANE}
          suppressNextMapClearRef={suppressNextMapClearRef}
        />
      ))}
    </>
  )
})

export default VisibleSchoolMarkers
