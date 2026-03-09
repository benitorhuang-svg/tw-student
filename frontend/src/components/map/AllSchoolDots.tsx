import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'

type SchoolCoord = {
  code: string
  name: string
  countyId: string
  townshipId: string
  longitude: number
  latitude: number
}

type SchoolLookup = {
  schools: Record<string, SchoolCoord>
}

type AllSchoolDotsProps = {
  onSelectSchool: (schoolId: string | null) => void
}

function AllSchoolDots({ onSelectSchool }: AllSchoolDotsProps) {
  const map = useMap()
  const [data, setData] = useState<SchoolCoord[] | null>(null)
  const [, setVersion] = useState(0)

  useEffect(() => {
    fetch('./data/school-coordinate-lookup.json')
      .then((res) => res.json())
      .then((json: SchoolLookup) => setData(Object.values(json.schools)))
      .catch(() => {})
  }, [])

  useMapEvents({
    moveend: () => setVersion((v) => v + 1),
    zoomend: () => setVersion((v) => v + 1),
  })

  const visible = useMemo(() => {
    if (!data) return []
    const zoom = map.getZoom()
    if (zoom < 11) return []
    const bounds = map.getBounds()
    return data.filter((s) =>
      s.latitude && s.longitude && bounds.contains([s.latitude, s.longitude]),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, map.getZoom(), map.getBounds().toBBoxString()])

  if (!visible.length) return null

  const zoom = map.getZoom()
  const radius = zoom >= 14 ? 5 : zoom >= 12 ? 4 : 3

  return (
    <>
      {visible.map((s) => (
        <CircleMarker
          key={s.code}
          center={[s.latitude, s.longitude]}
          radius={radius}
          pathOptions={{
            color: '#0284c7',
            fillColor: '#38bdf8',
            fillOpacity: 0.7,
            weight: 1,
          }}
          eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); onSelectSchool(s.code) } }}
        >
          <Tooltip direction="top" offset={[0, -4]} className="atlas-map-tooltip">
            {s.name}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  )
}

export default AllSchoolDots
