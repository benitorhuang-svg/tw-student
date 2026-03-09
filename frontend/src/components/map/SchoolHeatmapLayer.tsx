import { useEffect, useMemo } from 'react'

import L from 'leaflet'
import 'leaflet.heat'
import { useMap } from 'react-leaflet'

import type { SchoolMapPoint } from './types'

const LIGHT_GRADIENT = {
  0.1: '#60a5fa',
  0.25: '#38bdf8',
  0.55: '#14b8a6',
  0.8: '#22c55e',
  1: '#f59e0b',
}

const DARK_GRADIENT = {
  0.08: '#38bdf8',
  0.22: '#22d3ee',
  0.48: '#2dd4bf',
  0.72: '#a3e635',
  1: '#facc15',
}

type SchoolHeatmapLayerProps = {
  points: SchoolMapPoint[]
  theme: 'light' | 'dark'
}

function SchoolHeatmapLayer({ points, theme }: SchoolHeatmapLayerProps) {
  const map = useMap()
  const weightedPoints = useMemo(() => {
    const maxStudents = Math.max(...points.map((point) => point.currentStudents), 1)

    return points.map(
      (point) =>
        [
          point.latitude,
          point.longitude,
          Math.max(0.35, Math.min(1.25, Math.pow(point.currentStudents / maxStudents, 0.42) * 1.15)),
        ] as [number, number, number],
    )
  }, [points])

  useEffect(() => {
    if (weightedPoints.length === 0) {
      return
    }

    const heatLayer = L.heatLayer(weightedPoints, {
      radius: 34,
      blur: 30,
      maxZoom: 12,
      minOpacity: theme === 'dark' ? 0.42 : 0.38,
      gradient: theme === 'dark' ? DARK_GRADIENT : LIGHT_GRADIENT,
    })

    heatLayer.addTo(map)

    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, theme, weightedPoints])

  return null
}

export default SchoolHeatmapLayer