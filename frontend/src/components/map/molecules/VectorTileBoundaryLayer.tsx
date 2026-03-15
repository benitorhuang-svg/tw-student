import { useEffect, useRef } from 'react'
import L from 'leaflet'
// leaflet.vectorgrid ships only UMD; import bundled file directly so
// Vite can resolve it.  the package.json `main` points to a CJS entry that
// Vite's import-analysis sometimes fails on.
import 'leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.min.js'
import { useMap } from 'react-leaflet'
import type { CountySummary, RankingSummary } from '../../../lib/analytics'

import {
  choroplethColor,
  choroplethOpacity,
  buildHoverPreviewHtml,
} from '../mapStyles'

export type VectorTileBoundaryLayerProps = {
  baseUrl: string 
  onError?: () => void 
  activeCountyId: string | null
  activeTownshipId: string | null
  highlightedCountyId?: string | null
  highlightedTownshipId?: string | null
  onSelectCounty: (id: string, options?: { skipTabSwitch?: boolean }) => void
  onSelectTownship: (id: string, options?: { skipTabSwitch?: boolean }) => void
  countyLookup: Map<string, CountySummary>
  townshipLookup: Map<string, RankingSummary>
}

function VectorTileBoundaryLayer({
  baseUrl,
  onError,
  activeCountyId,
  activeTownshipId,
  highlightedCountyId = null,
  highlightedTownshipId = null,
  onSelectCounty,
  onSelectTownship,
  countyLookup,
  townshipLookup,
}: VectorTileBoundaryLayerProps) {
  const map = useMap()
  const tooltipRef = useRef<L.Tooltip | null>(null)
  const countyLayerRef = useRef<any>(null)
  const townshipLayerRef = useRef<any>(null)

  // 1. Preflight check
  useEffect(() => {
    if (!baseUrl) return
    const url = `${baseUrl}/county/0/0/0.pbf`
    fetch(url, { method: 'HEAD' })
      .then((r) => {
        if (!r.ok) throw new Error('tile not ok')
      })
      .catch(() => {
        console.warn('[VectorTileBoundaryLayer] preflight check failed', url)
        if (onError) onError()
      })
  }, [baseUrl, onError])

  // 2. Pre-create shared tooltip instance
  useEffect(() => {
    tooltipRef.current = L.tooltip({
      direction: 'top',
      offset: [0, -10],
      className: 'atlas-map-tooltip atlas-map-tooltip--preview',
    })
    return () => { tooltipRef.current?.remove() }
  }, [])

  // 1. Initial layer creation (Once per baseUrl)
  useEffect(() => {
    if (!map || !baseUrl) return

    const vectorGrid = (L as any).vectorGrid

    const countyLayer = vectorGrid.protobuf(`${baseUrl}/county/{z}/{x}/{y}.pbf`, {
      vectorTileLayerStyles: {
        county: (props: any) => {
          const summary = countyLookup.get(props.countyId)
          if (!summary || summary.filteredOut) return { opacity: 0, fillOpacity: 0, weight: 0 }
          return {
            color: 'rgba(0,0,0,0.15)',
            weight: 0.8,
            fillColor: choroplethColor(summary.students),
            fillOpacity: Math.min(0.12, choroplethOpacity(summary.students)),
          }
        }
      },
      interactive: true,
      getFeatureId: (f: any) => f.properties?.countyId,
    }).addTo(map)

    const townshipLayer = vectorGrid.protobuf(`${baseUrl}/township/{z}/{x}/{y}.pbf`, {
      vectorTileLayerStyles: {
        township: (props: any) => {
          const summary = townshipLookup.get(props.townId)
          if (!summary) return { opacity: 0, fillOpacity: 0, weight: 0 }
          return {
            color: 'rgba(0,0,0,0.1)',
            weight: 0.6,
            fillColor: choroplethColor(summary.students),
            fillOpacity: Math.max(0.04, choroplethOpacity(summary.students) - 0.06),
          }
        }
      },
      interactive: true,
      getFeatureId: (f: any) => f.properties?.townId,
    }).addTo(map)

    countyLayerRef.current = countyLayer
    townshipLayerRef.current = townshipLayer

    // Event handlers for tooltips & clicks
    const showTip = (e: any, name: string, students: number) => {
      if (!tooltipRef.current) return
      tooltipRef.current
        .setLatLng(e.latlng)
        .setContent(buildHoverPreviewHtml(name, students))
        .addTo(map)
    }

    const hideTip = () => { tooltipRef.current?.remove() }

    countyLayer.on('mouseover', (e: any) => {
      const summary = countyLookup.get(e.layer.properties.countyId)
      if (summary) showTip(e, summary.name, summary.students)
    })
    countyLayer.on('mouseout', hideTip)
    countyLayer.on('click', (e: any) => {
      L.DomEvent.stop(e.originalEvent)
      const id = e.layer.properties.countyId
      if (id) onSelectCounty(id, { skipTabSwitch: true })
    })

    townshipLayer.on('mouseover', (e: any) => {
      const summary = townshipLookup.get(e.layer.properties.townId)
      if (summary) showTip(e, summary.label, summary.students)
    })
    townshipLayer.on('mouseout', hideTip)
    townshipLayer.on('click', (e: any) => {
      L.DomEvent.stop(e.originalEvent)
      const id = e.layer.properties.townId
      if (id) onSelectTownship(id, { skipTabSwitch: true })
    })

    return () => {
      countyLayer.remove()
      townshipLayer.remove()
    }
  }, [map, baseUrl]) 

  // 2. Dynamic styling updates (On state change) without re-adding layers
  useEffect(() => {
    const cLayer = countyLayerRef.current
    const tLayer = townshipLayerRef.current
    if (!cLayer || !tLayer) return

    // Update County highlights
    countyLookup.forEach((summary, id) => {
      const isHighlighted = id === highlightedCountyId || id === activeCountyId
      cLayer.setFeatureStyle(id, {
        color: isHighlighted ? '#000000' : 'rgba(0,0,0,0.15)',
        weight: isHighlighted ? 1.6 : 0.8,
        fillOpacity: isHighlighted ? 0.2 : Math.min(0.12, choroplethOpacity(summary.students)),
      })
    })

    // Update Township highlights
    townshipLookup.forEach((summary, id) => {
      const isHighlighted = id === highlightedTownshipId || id === activeTownshipId
      tLayer.setFeatureStyle(id, {
        color: isHighlighted ? '#000000' : 'rgba(0,0,0,0.1)',
        weight: isHighlighted ? 1.6 : 0.6,
        fillColor: id === activeTownshipId ? '#cfe6d3' : choroplethColor(summary.students),
        fillOpacity: isHighlighted ? 0.35 : Math.max(0.04, choroplethOpacity(summary.students) - 0.06),
      })
    })
  }, [activeCountyId, activeTownshipId, highlightedCountyId, highlightedTownshipId, countyLookup, townshipLookup])

  return null
}

export default VectorTileBoundaryLayer
