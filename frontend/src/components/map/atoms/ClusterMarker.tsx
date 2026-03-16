import { Tooltip, useMap } from 'react-leaflet'
import { getSchoolLevelColor } from '../schoolMarkerTheme'
import { getClusterRadius } from '../utils/clusterHelpers'
import { buildClusterMarkerAriaLabel, renderClusterHoverCard } from '../atoms/MapHoverCard'
import { AccessibleCircleMarker } from '../molecules/AccessibleCircleMarker'
import type { ClusterPoint } from '../hooks/useSchoolClustering'

type ClusterMarkerProps = {
  cluster: ClusterPoint
  maxStudentsInView: number
  zoom: number
}

export function ClusterMarker({ cluster, maxStudentsInView, zoom }: ClusterMarkerProps) {
  const map = useMap()
  const radius = getClusterRadius(cluster.count, cluster.totalStudents, maxStudentsInView, zoom)
  const clusterColor = getSchoolLevelColor(cluster.dominantEducationLevel)

  return (
    <AccessibleCircleMarker
      center={[cluster.latitude, cluster.longitude]}
      radius={radius}
      pathOptions={{
        color: '#ffffff',
        weight: 2,
        fillColor: clusterColor,
        fillOpacity: 0.85,
        className: 'atlas-cluster-marker',
      }}
      ariaLabel={buildClusterMarkerAriaLabel(cluster.count, cluster.totalStudents)}
      onActivate={() => {
        map.flyTo([cluster.latitude, cluster.longitude], Math.min(zoom + 2, 13), {
          animate: true,
          duration: 0.8,
        })
      }}
      tooltipContent={renderClusterHoverCard(cluster.count, cluster.totalStudents)}
    >
      <Tooltip direction="center" permanent className="atlas-cluster-label">
        {cluster.count}
      </Tooltip>
    </AccessibleCircleMarker>
  )
}
