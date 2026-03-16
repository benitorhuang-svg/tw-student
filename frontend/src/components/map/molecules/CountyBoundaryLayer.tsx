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
  showMarkers: boolean
  activeTownshipId: string | null
  onSelectCounty: (countyId: string, options?: { skipTabSwitch?: boolean }) => void
  onHoverCounty: (countyId: string | null) => void
  setHoveredFeatureId: (id: string | null) => void
}

export function CountyBoundaryLayer({
  countyBoundaries,
  countyLookup,
  activeCountyId,
  hoveredFeatureId,
  highlightedCountyId,
  activeTownshipId,
  theme,
  showMarkers,
  onSelectCounty,
  onHoverCounty,
  setHoveredFeatureId,
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

        const baseStroke = theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
        const highlightStroke = theme === 'dark' ? '#e2e8f0' : '#000000'
        const baseWeight = 0.8
        const highlightWeight = 1.6

        return {
          color: isActive || isHovered ? highlightStroke : baseStroke,
          weight: isActive || isHovered ? highlightWeight : baseWeight,
          fillColor: isActive ? (theme === 'dark' ? '#10b981' : '#10b981') : choroplethColor(summary.students),
          fillOpacity: isActive ? (activeTownshipId ? 0 : (theme === 'dark' ? 0.4 : 0.25)) : Math.min(0.12, choroplethOpacity(summary.students)),
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
            layer.openTooltip?.()
          },
          mouseout: () => {
            setHoveredFeatureId(null)
            onHoverCounty(null)
            layer.closeTooltip?.()
          },
        })
      }}
    />
  )
}
