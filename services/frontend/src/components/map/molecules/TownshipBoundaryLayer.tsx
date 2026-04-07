import { GeoJSON } from 'react-leaflet'
import type { Feature, GeoJsonObject } from 'geojson'
import L from 'leaflet'
import { buildHoverPreviewHtml, choroplethColor, choroplethOpacity } from '../mapStyles'
import type { TownshipBoundaryCollection, TownshipBoundaryProperties } from '../../../data/educationData'
import type { RankingSummary } from '../../../lib/analytics'

interface TownshipBoundaryLayerProps {
  data: TownshipBoundaryCollection
  townshipLookup: Map<string, RankingSummary>
  activeTownshipId: string | null
  hoveredFeatureId: string | null
  highlightedTownshipId: string | null
  theme: 'light' | 'dark'
  showMarkers?: boolean
  onSelectTownship: (townshipId: string, options?: { skipTabSwitch?: boolean }) => void
  setHoveredFeatureId: (id: string | null) => void
  showMapTooltip?: (latlng: L.LatLng, content: string) => void
  hideMapTooltip?: () => void
}

export function TownshipBoundaryLayer({
  data,
  townshipLookup,
  activeTownshipId,
  hoveredFeatureId,
  highlightedTownshipId,
  theme,
  showMarkers = false,
  onSelectTownship,
  setHoveredFeatureId,
  showMapTooltip,
  hideMapTooltip,
}: TownshipBoundaryLayerProps) {
  const previewTipOpts = { 
    direction: 'top' as const, 
    offset: [0, -10] as [number, number], 
    className: 'atlas-map-tooltip atlas-map-tooltip--preview', 
    opacity: 1 
  }

  return (
    <GeoJSON
      data={data as GeoJsonObject}
      style={(feature: Feature | undefined) => {
        const properties = feature?.properties as TownshipBoundaryProperties | undefined
        const townshipId = properties?.townId ?? ''
        const summary = townshipLookup.get(townshipId) ?? null
        const isActive = townshipId === activeTownshipId
        const isHovered = townshipId === hoveredFeatureId || townshipId === highlightedTownshipId

        const baseStroke = theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
        const highlightStroke = theme === 'dark' ? '#e2e8f0' : '#000000'
        const baseWeight = 0.7
        const highlightWeight = 1.6

        const activeFillColor = '#10b981'
        const activeFillOpacity = 0.4

        return {
          color: isActive || isHovered ? highlightStroke : baseStroke,
          weight: isActive || isHovered ? highlightWeight : baseWeight,
          fillColor: isActive ? activeFillColor : choroplethColor(summary?.students ?? 0),
          fillOpacity: isActive ? activeFillOpacity : (summary ? Math.max(0.05, choroplethOpacity(summary.students) - 0.06) : 0.04),
        }
      }}
      onEachFeature={(feature: Feature, layer: L.Layer) => {
        const properties = feature.properties as TownshipBoundaryProperties
        const summary = townshipLookup.get(properties.townId) ?? null
        if (summary && !showMarkers) {
          layer.bindTooltip(buildHoverPreviewHtml(summary.label, summary.students), previewTipOpts)
        }
        layer.on({
          click: (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e.originalEvent)
            onSelectTownship(properties.townId, { skipTabSwitch: true })
          },
          dblclick: (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e.originalEvent)
            onSelectTownship(properties.townId) // Full drill-down
          },
          mouseover: (e: L.LeafletMouseEvent) => {
            if (e.target.setStyle) {
              e.target.setStyle({ cursor: 'pointer' })
            }
            setHoveredFeatureId(properties.townId)
            if (summary && showMapTooltip) {
              showMapTooltip(e.latlng, buildHoverPreviewHtml(summary.label, summary.students))
            }
            layer.openTooltip?.()
          },
          mouseout: () => {
            setHoveredFeatureId(null)
            hideMapTooltip?.()
            layer.closeTooltip?.()
          },
        })
      }}
    />
  )
}
