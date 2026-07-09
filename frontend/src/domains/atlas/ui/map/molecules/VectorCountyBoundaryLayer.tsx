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
import type { CountySummary } from '@/shared/lib/analytics'
import { growthChoroplethColor, growthChoroplethOpacity, buildHoverPreviewHtml } from '../mapStyles'

type CountyTileProperties = {
  countyId?: string
}

type VectorTileFeature = {
  properties?: CountyTileProperties
}

type VectorGridMouseEvent = L.LeafletMouseEvent & {
  layer: { properties: CountyTileProperties }
}

type CanvasTileFactory = (...args: unknown[]) => L.Canvas
type LeafletWithCanvasTile = typeof L & {
  canvas: typeof L.canvas & { tile: CanvasTileFactory }
}

type VectorGridLayer = L.Layer & {
  setFeatureStyle: (id: string, style: L.PathOptions) => void
  on: (event: 'mouseover' | 'mouseout' | 'click' | 'dblclick', handler: (event: VectorGridMouseEvent) => void) => VectorGridLayer
}

type VectorGridNamespace = {
  slicer: (
    data: GeoJSON,
    options: {
      rendererFactory?: CanvasTileFactory
      pane: string
      vectorTileLayerStyles: {
        sliced: (props: CountyTileProperties) => L.PathOptions
      }
      interactive: boolean
      getFeatureId: (feature: VectorTileFeature) => string | undefined
    }
  ) => VectorGridLayer
}

function countyTrendFillOpacity(summary: CountySummary, theme: 'light' | 'dark') {
  const scaled = growthChoroplethOpacity(summary.deltaRatio) * (theme === 'dark' ? 0.66 : 0.62)
  return Math.max(theme === 'dark' ? 0.24 : 0.22, Math.min(theme === 'dark' ? 0.5 : 0.44, scaled))
}

export type CountyBoundaryLayerProps = {
  theme: 'light' | 'dark'
  data: GeoJSON

  activeCountyId: string | null
  activeTownshipId: string | null
  highlightedCountyId: string | null
  onSelectCounty: (id: string, options?: { skipTabSwitch?: boolean }) => void
  countyLookup: Map<string, CountySummary>
  visible: boolean
}

/**
 * Molecule/Atom: VectorCountyBoundaryLayer
 * Renders county boundaries using vector tiles.
 */
const VectorCountyBoundaryLayer = memo(({
  theme,
  data,

  activeCountyId,
  activeTownshipId,
  highlightedCountyId,
  onSelectCounty,
  countyLookup,
  visible,
}: CountyBoundaryLayerProps) => {
  const map = useMap()
  const layerRef = useRef<VectorGridLayer | null>(null)
  const tooltipRef = useRef<L.Tooltip | null>(null)
  const styleStateRef = useRef({ activeCountyId, activeTownshipId, highlightedCountyId, theme })

  // Stable references for event handlers
  const handlersRef = useRef({ onSelectCounty, countyLookup })
  useEffect(() => {
    handlersRef.current = { onSelectCounty, countyLookup }
  }, [onSelectCounty, countyLookup])
  useEffect(() => {
    styleStateRef.current = { activeCountyId, activeTownshipId, highlightedCountyId, theme }
  }, [activeCountyId, activeTownshipId, highlightedCountyId, theme])

  useEffect(() => {
    if (!map) return
    if (!map.getPane('county-pane')) {
      map.createPane('county-pane').style.zIndex = '400'
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
      pane: 'county-pane',
      vectorTileLayerStyles: {
        sliced: (props) => {
          if (!props.countyId) return { opacity: 0, fillOpacity: 0, weight: 0 }
          const summary = handlersRef.current.countyLookup.get(props.countyId)
          if (!summary || summary.filteredOut) return { opacity: 0, fillOpacity: 0, weight: 0 }
          const {
            activeCountyId: currentActiveCountyId,
            activeTownshipId: currentActiveTownshipId,
            highlightedCountyId: currentHighlightedCountyId,
            theme: currentTheme,
          } = styleStateRef.current

          const isActive = props.countyId === currentActiveCountyId
          const isHighlighted = props.countyId === currentHighlightedCountyId

          const baseStroke = currentTheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
          const highlightStroke = currentTheme === 'dark' ? '#f8fafc' : '#1e293b'
          const baseWeight = 1.0
          const highlightWeight = 2.0

          return {
            color: isActive || isHighlighted ? highlightStroke : baseStroke,
            weight: isActive || isHighlighted ? highlightWeight : baseWeight,
            fillColor: isActive ? '#10b981' : growthChoroplethColor(summary.deltaRatio),
            fillOpacity: isActive
              ? (currentActiveTownshipId ? 0.05 : 0.45)
              : countyTrendFillOpacity(summary, currentTheme),
          }
        },
      },
      interactive: true,
      getFeatureId: (f) => f.properties?.countyId,
    })
    layerRef.current = layer

    layer.on('mouseover', (event) => {
      const countyId = event.layer.properties?.countyId
      if (!countyId) return

      const summary = handlersRef.current.countyLookup.get(countyId)
      if (summary && tooltipRef.current) {
        tooltipRef.current.setLatLng(event.latlng).setContent(buildHoverPreviewHtml(summary.name, summary.students))
        if (!map.hasLayer(tooltipRef.current)) tooltipRef.current.addTo(map)
      }
    })
    layer.on('mouseout', () => tooltipRef.current?.remove())
    layer.on('click', (event) => {
      L.DomEvent.stop(event.originalEvent)
      const id = event.layer.properties?.countyId
      if (id) handlersRef.current.onSelectCounty(id, { skipTabSwitch: false })
    })

    return () => {
      layer.remove()
      tooltipRef.current?.remove()
    }
  }, [map, data]) // Re-create layer when data changes

  useEffect(() => {
    if (!layerRef.current) return
    if (visible) {
      if (!map.hasLayer(layerRef.current)) layerRef.current.addTo(map)
    } else {
      if (map.hasLayer(layerRef.current)) layerRef.current.remove()
    }
  }, [map, visible])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    countyLookup.forEach((summary, id) => {
      const isHovered = id === highlightedCountyId
      const isActive = id === activeCountyId
      const isVisible = isHovered || isActive
      layer.setFeatureStyle(id, {
        color: isVisible ? (theme === 'dark' ? '#f8fafc' : '#000000') : (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'),
        weight: isVisible ? 1.6 : 0.8,
        fillColor: isActive ? '#10b981' : growthChoroplethColor(summary.deltaRatio),
        fillOpacity: isActive
          ? (activeTownshipId ? 0.05 : (theme === 'dark' ? 0.4 : 0.28))
          : isHovered ? 0.34 : countyTrendFillOpacity(summary, theme),
      })
    })
  }, [activeCountyId, activeTownshipId, highlightedCountyId, countyLookup, theme])

  return null
})

export default VectorCountyBoundaryLayer
