import { GeoJSON } from 'react-leaflet'
import type { Feature, GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { buildHoverPreviewHtml, choroplethColor, choroplethOpacity } from '../mapStyles'
import type { CountyBoundaryCollection, CountyBoundaryProperties } from '../../../data/educationData'
import type { CountySummary } from '../../../lib/analytics'

interface CountyBoundaryLayerProps {
  countyBoundaries: CountyBoundaryCollection
  countyLookup: Map<string, CountySummary>
  activeCountyId: string | null
  hoveredFeatureId: string | null
  highlightedCountyId: string | null
  theme: 'light' | 'dark'
  showMarkers?: boolean
  activeTownshipId: string | null
  onSelectCounty: (countyId: string, options?: { skipTabSwitch?: boolean }) => void
  onHoverCounty: (countyId: string | null) => void
  setHoveredFeatureId: (id: string | null) => void
  showMapTooltip?: (latlng: L.LatLng, content: string) => void
  hideMapTooltip?: () => void
}

export function CountyBoundaryLayer({
  countyBoundaries,
  countyLookup,
  activeCountyId,
  hoveredFeatureId,
  highlightedCountyId,
  activeTownshipId,
  theme,
  showMarkers = false,
  onSelectCounty,
  onHoverCounty,
  setHoveredFeatureId,
  showMapTooltip,
  hideMapTooltip,
}: CountyBoundaryLayerProps) {
  const previewTipOpts = {
    direction: 'top' as const,
    offset: [0, -8] as [number, number],
    className: 'atlas-map-tooltip atlas-map-tooltip--preview',
    opacity: 1
  }

  return (
    <GeoJSON
      data={countyBoundaries as GeoJsonObject}
      style={(feature: Feature | undefined) => {
        const properties = feature?.properties as CountyBoundaryProperties | undefined
        const countyId = properties?.countyId ?? ''
        const summary = countyLookup.get(countyId) ?? null
        const isActive = countyId === activeCountyId
        const isHovered = countyId === hoveredFeatureId || countyId === highlightedCountyId

        if (!summary || summary.filteredOut) {
          return {
            color: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            weight: 0.8,
            fillColor: 'transparent',
            fillOpacity: 0,
          }
        }

        const baseStroke = theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
        const highlightStroke = theme === 'dark' ? '#f8fafc' : '#1e293b'
        const baseWeight = 1.0
        const highlightWeight = 2.0

        return {
          color: isActive || isHovered ? highlightStroke : baseStroke,
          weight: isActive || isHovered ? highlightWeight : baseWeight,
          fillColor: isActive ? '#10b981' : choroplethColor(summary.students),
          fillOpacity: isActive 
            ? (activeTownshipId ? 0.05 : 0.45) 
            : Math.max(0.2, choroplethOpacity(summary.students)),
        }
      }}
      onEachFeature={(feature: Feature, layer: L.Layer) => {
        const properties = feature.properties as CountyBoundaryProperties
        const summary = countyLookup.get(properties.countyId) ?? null
        if (summary && !showMarkers) {
          layer.bindTooltip(buildHoverPreviewHtml(summary.name, summary.students), previewTipOpts)
        }
        layer.on({
          click: (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e.originalEvent)
            onSelectCounty(properties.countyId, { skipTabSwitch: true })
          },
          dblclick: (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e.originalEvent)
            onSelectCounty(properties.countyId) // Full drill-down on double click
          },
          mouseover: (e: L.LeafletMouseEvent) => {
            if (e.target.setStyle) {
              e.target.setStyle({ cursor: 'pointer' })
            }
            setHoveredFeatureId(properties.countyId)
            onHoverCounty(properties.countyId)
            if (summary && showMapTooltip) {
              showMapTooltip(e.latlng, buildHoverPreviewHtml(summary.name, summary.students))
            }
            layer.openTooltip?.()
          },
          mouseout: () => {
            setHoveredFeatureId(null)
            onHoverCounty(null)
            hideMapTooltip?.()
            layer.closeTooltip?.()
          },
        })
      }}
    />
  )
}
