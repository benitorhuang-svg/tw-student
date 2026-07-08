import { useEffect, useRef, memo } from 'react'
import L from 'leaflet'
import type { GeoJSON } from 'geojson'

// Polyfill for Leaflet.VectorGrid compatibility with Leaflet 1.8+
type DomEventWithFakeStop = typeof L.DomEvent & {
  fakeStop?: () => boolean
}

const domEvent = L.DomEvent as DomEventWithFakeStop
if (!domEvent.fakeStop) {
  domEvent.fakeStop = function () {
    return true
  }
}

import 'leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.min.js'
import { useMap } from 'react-leaflet'
import type { RankingSummary } from '@/shared/lib/analytics'
import { choroplethColor, choroplethOpacity, buildHoverPreviewHtml } from '../mapStyles'

type TownshipTileProperties = {
  townId?: string
}

type VectorTileFeature = {
  properties?: TownshipTileProperties
}

type VectorGridMouseEvent = L.LeafletMouseEvent & {
  layer: { properties: TownshipTileProperties }
}

type CanvasTileFactory = (...args: unknown[]) => L.Canvas
type LeafletWithCanvasTile = typeof L & {
  canvas: typeof L.canvas & { tile: CanvasTileFactory }
}

type VectorGridLayer = L.Layer & {
  setFeatureStyle: (id: string, style: L.PathOptions) => void
  bringToFront: () => VectorGridLayer
  on: (event: 'mouseover' | 'mouseout' | 'click' | 'dblclick', handler: (event: VectorGridMouseEvent) => void) => VectorGridLayer
}

type VectorGridNamespace = {
  slicer: (
    data: GeoJSON,
    options: {
      rendererFactory?: CanvasTileFactory
      pane: string
      vectorTileLayerStyles: {
        sliced: (props: TownshipTileProperties) => L.PathOptions
      }
      interactive: boolean
      getFeatureId: (feature: VectorTileFeature) => string | undefined
    }
  ) => VectorGridLayer
}

export type TownshipBoundaryLayerProps = {
  theme: 'light' | 'dark'
  data: GeoJSON
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
  data,
  activeTownshipId,
  highlightedTownshipId,
  onSelectTownship,
  townshipLookup,
  visible,
}: TownshipBoundaryLayerProps) => {
  const map = useMap()
  const layerRef = useRef<VectorGridLayer | null>(null)
  const tooltipRef = useRef<L.Tooltip | null>(null)
  const styleStateRef = useRef({ activeTownshipId, highlightedTownshipId, theme })

  // Stable references for event handlers
  const handlersRef = useRef({ onSelectTownship, townshipLookup })
  useEffect(() => {
    handlersRef.current = { onSelectTownship, townshipLookup }
  }, [onSelectTownship, townshipLookup])
  useEffect(() => {
    styleStateRef.current = { activeTownshipId, highlightedTownshipId, theme }
  }, [activeTownshipId, highlightedTownshipId, theme])

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

    const vectorGrid = (L as typeof L & { vectorGrid: VectorGridNamespace }).vectorGrid
    const leafletWithCanvasTile = L as LeafletWithCanvasTile
    const layer = vectorGrid.slicer(data, {
      rendererFactory: leafletWithCanvasTile.canvas.tile,
      pane: 'township-pane',
      vectorTileLayerStyles: {
        sliced: (props) => {
          if (!props.townId) return { opacity: 0, fillOpacity: 0, weight: 0 }
          const summary = handlersRef.current.townshipLookup.get(props.townId)
          if (!summary) return { opacity: 0, fillOpacity: 0, weight: 0 }
          const {
            activeTownshipId: currentActiveTownshipId,
            highlightedTownshipId: currentHighlightedTownshipId,
            theme: currentTheme,
          } = styleStateRef.current

          const isActive = props.townId === currentActiveTownshipId
          const isHighlighted = props.townId === currentHighlightedTownshipId

          const baseStroke = currentTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
          const highlightStroke = currentTheme === 'dark' ? '#f8fafc' : '#1e293b'
          const baseWeight = 0.6
          const highlightWeight = 1.2

          return {
            color: isActive || isHighlighted ? highlightStroke : baseStroke,
            weight: isActive || isHighlighted ? highlightWeight : baseWeight,
            fillColor: isActive ? '#34d399' : choroplethColor(summary.students),
            fillOpacity: isActive
                ? 0.35
                : Math.max(0.04, choroplethOpacity(summary.students) - 0.06),
          }
        },
      },
      interactive: true,
      getFeatureId: (f) => f.properties?.townId,
    })
    layerRef.current = layer

    layer.on('mouseover', (event) => {
      const townId = event.layer.properties?.townId
      if (!townId) return

      const summary = handlersRef.current.townshipLookup.get(townId)
      if (summary && tooltipRef.current) {
        tooltipRef.current.setLatLng(event.latlng).setContent(buildHoverPreviewHtml(summary.label, summary.students))
        if (!map.hasLayer(tooltipRef.current)) tooltipRef.current.addTo(map)
      }
    })
    layer.on('mouseout', () => tooltipRef.current?.remove())
    layer.on('click', (event) => {
      L.DomEvent.stop(event.originalEvent)
      const id = event.layer.properties?.townId
      if (id) handlersRef.current.onSelectTownship(id, { skipTabSwitch: true })
    })
    layer.on('dblclick', (event) => {
      L.DomEvent.stop(event.originalEvent)
      const id = event.layer.properties?.townId
      if (id) handlersRef.current.onSelectTownship(id)
    })

    return () => {
      layer.remove()
      tooltipRef.current?.remove()
    }
  }, [map, data, theme])

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
  }, [activeTownshipId, highlightedTownshipId, townshipLookup, theme, map])

  return null
})

export default VectorTownshipBoundaryLayer
