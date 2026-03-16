import { useEffect, useRef, memo } from 'react'
import L from 'leaflet'
import 'leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.min.js'
import { useMap } from 'react-leaflet'
import type { CountySummary } from '../../../lib/analytics'
import { choroplethColor, choroplethOpacity, buildHoverPreviewHtml } from '../mapStyles'

export type CountyBoundaryLayerProps = {
  theme: 'light' | 'dark'
  baseUrl: string
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
  baseUrl,
  activeCountyId,
  activeTownshipId,
  highlightedCountyId,
  onSelectCounty,
  countyLookup,
  visible,
}: CountyBoundaryLayerProps) => {
  const map = useMap()
  const layerRef = useRef<any>(null)
  const tooltipRef = useRef<L.Tooltip | null>(null)

  // Stable references for event handlers
  const handlersRef = useRef({ onSelectCounty, countyLookup })
  useEffect(() => {
    handlersRef.current = { onSelectCounty, countyLookup }
  }, [onSelectCounty, countyLookup])

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

    const vectorGrid = (L as any).vectorGrid
    const layer = vectorGrid.protobuf(`${baseUrl}/county/{z}/{x}/{y}.pbf`, {
      pane: 'county-pane',
      vectorTileLayerStyles: {
        county: (props: any) => {
          const summary = handlersRef.current.countyLookup.get(props.countyId)
          if (!summary || summary.filteredOut) return { opacity: 0, fillOpacity: 0, weight: 0 }
          return {
            color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
            weight: 0.8,
            fillColor: choroplethColor(summary.students),
            fillOpacity: Math.min(0.12, choroplethOpacity(summary.students)),
          }
        },
      },
      interactive: true,
      getFeatureId: (f: any) => f.properties?.countyId,
    })

    if (visible) layer.addTo(map)
    layerRef.current = layer

    layer.on('mouseover', (e: any) => {
      const summary = handlersRef.current.countyLookup.get(e.layer.properties.countyId)
      if (summary && tooltipRef.current) {
        tooltipRef.current.setLatLng(e.latlng).setContent(buildHoverPreviewHtml(summary.name, summary.students))
        if (!map.hasLayer(tooltipRef.current)) tooltipRef.current.addTo(map)
      }
    })
    layer.on('mouseout', () => tooltipRef.current?.remove())
    layer.on('click', (e: any) => {
      L.DomEvent.stop(e.originalEvent)
      const id = e.layer.properties.countyId
      if (id) handlersRef.current.onSelectCounty(id, { skipTabSwitch: true })
    })

    return () => {
      layer.remove()
      tooltipRef.current?.remove()
    }
  }, [map, baseUrl, theme]) // Only recreate on major changes

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
        fillColor: isActive ? '#10b981' : choroplethColor(summary.students),
        fillOpacity: isActive ? (activeTownshipId ? 0.05 : (theme === 'dark' ? 0.4 : 0.25)) : isHovered ? 0.2 : Math.min(0.12, choroplethOpacity(summary.students)),
      })
    })
  }, [activeCountyId, activeTownshipId, highlightedCountyId, countyLookup, theme])

  return null
})

export default VectorCountyBoundaryLayer
