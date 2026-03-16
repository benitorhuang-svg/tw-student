import { useEffect, useRef, memo } from 'react'
import L from 'leaflet'
import 'leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.min.js'
import { useMap } from 'react-leaflet'
import type { RankingSummary } from '../../../lib/analytics'
import { choroplethColor, choroplethOpacity, buildHoverPreviewHtml } from '../mapStyles'

export type TownshipBoundaryLayerProps = {
  theme: 'light' | 'dark'
  baseUrl: string
  activeTownshipId: string | null
  highlightedTownshipId: string | null
  onSelectTownship: (id: string, options?: { skipTabSwitch?: boolean }) => void
  townshipLookup: Map<string, RankingSummary>
  visible: boolean
}

/**
 * Molecule/Atom: VectorTownshipBoundaryLayer
 * Renders township boundaries using vector tiles.
 */
const VectorTownshipBoundaryLayer = memo(({
  theme,
  baseUrl,
  activeTownshipId,
  highlightedTownshipId,
  onSelectTownship,
  townshipLookup,
  visible,
}: TownshipBoundaryLayerProps) => {
  const map = useMap()
  const layerRef = useRef<any>(null)
  const tooltipRef = useRef<L.Tooltip | null>(null)

  // Stable references for event handlers
  const handlersRef = useRef({ onSelectTownship, townshipLookup })
  useEffect(() => {
    handlersRef.current = { onSelectTownship, townshipLookup }
  }, [onSelectTownship, townshipLookup])

  useEffect(() => {
    if (!map) return
    if (!map.getPane('township-pane')) {
      map.createPane('township-pane').style.zIndex = '450'
    }

    tooltipRef.current = L.tooltip({
      direction: 'top',
      offset: [0, -10],
      className: 'atlas-map-tooltip atlas-map-tooltip--preview',
    })

    const vectorGrid = (L as any).vectorGrid
    const layer = vectorGrid.protobuf(`${baseUrl}/township/{z}/{x}/{y}.pbf`, {
      pane: 'township-pane',
      vectorTileLayerStyles: {
        township: (props: any) => {
          const summary = handlersRef.current.townshipLookup.get(props.townId)
          if (!summary) return { opacity: 0, fillOpacity: 0, weight: 0 }
          return {
            color: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
            weight: 0.6,
            fillColor: choroplethColor(summary.students),
            fillOpacity: Math.max(0.04, choroplethOpacity(summary.students) - 0.06),
          }
        },
      },
      interactive: true,
      getFeatureId: (f: any) => f.properties?.townId,
    })

    if (visible) layer.addTo(map)
    layerRef.current = layer

    layer.on('mouseover', (e: any) => {
      const summary = handlersRef.current.townshipLookup.get(e.layer.properties.townId)
      if (summary && tooltipRef.current) {
        tooltipRef.current
          .setLatLng(e.latlng)
          .setContent(buildHoverPreviewHtml((summary as any).label ?? (summary as any).name, summary.students))
        if (!map.hasLayer(tooltipRef.current)) tooltipRef.current.addTo(map)
      }
    })
    layer.on('mouseout', () => tooltipRef.current?.remove())
    layer.on('click', (e: any) => {
      L.DomEvent.stop(e.originalEvent)
      const id = e.layer.properties.townId
      if (id) handlersRef.current.onSelectTownship(id, { skipTabSwitch: true })
    })

    return () => {
      layer.remove()
      tooltipRef.current?.remove()
    }
  }, [map, baseUrl, theme])

  useEffect(() => {
    if (!layerRef.current) return
    if (visible) {
      if (!map.hasLayer(layerRef.current)) {
          layerRef.current.addTo(map)
          layerRef.current.bringToFront()
      }
    } else {
      if (map.hasLayer(layerRef.current)) layerRef.current.remove()
    }
  }, [map, visible])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    const zoom = map.getZoom()
    townshipLookup.forEach((summary, id) => {
      const isHovered = id === highlightedTownshipId
      const isActive = id === activeTownshipId
      const isMarked = isHovered || isActive
      const isVisible = zoom >= 11 || isMarked
      
      layer.setFeatureStyle(id, {
        color: isMarked ? (theme === 'dark' ? '#f8fafc' : '#000000') : (theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'),
        weight: isMarked ? 1.6 : 0.6,
        fillColor: isActive ? '#10b981' : choroplethColor(summary.students),
        opacity: isVisible ? 1 : 0,
        fillOpacity: isVisible ? (isActive ? 0.35 : isHovered ? 0.25 : Math.max(0.04, choroplethOpacity(summary.students) - 0.06)) : 0,
      })
    })
  }, [activeTownshipId, highlightedTownshipId, townshipLookup, theme, map.getZoom()])

  return null
})

export default VectorTownshipBoundaryLayer
