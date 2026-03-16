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
  theme: 'light' | 'dark'
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
  showCounties?: boolean
  showTownships?: boolean
}

function VectorTileBoundaryLayer({
  theme,
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
  showCounties = true,
  showTownships = true,
}: VectorTileBoundaryLayerProps) {
  const map = useMap()
  const tooltipRef = useRef<L.Tooltip | null>(null)
  const countyLayerRef = useRef<any>(null)
  const townshipLayerRef = useRef<any>(null)

  // Stable references for event handlers to avoid stale closures
  const handlersRef = useRef({ onSelectCounty, onSelectTownship, countyLookup, townshipLookup })
  useEffect(() => {
    handlersRef.current = { onSelectCounty, onSelectTownship, countyLookup, townshipLookup }
  }, [onSelectCounty, onSelectTownship, countyLookup, townshipLookup])

  // 1. Pane Management
  useEffect(() => {
    if (!map) return
    if (!map.getPane('county-pane')) {
      map.createPane('county-pane').style.zIndex = '400'
    }
    if (!map.getPane('township-pane')) {
      map.createPane('township-pane').style.zIndex = '450'
    }
  }, [map])

  // 2. Preflight check
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

  // 3. Tooltip Singleton
  useEffect(() => {
    tooltipRef.current = L.tooltip({
      direction: 'top',
      offset: [0, -10],
      className: 'atlas-map-tooltip atlas-map-tooltip--preview',
    })
    return () => { tooltipRef.current?.remove() }
  }, [])

  // 4. Initial layer creation
  useEffect(() => {
    if (!map || !baseUrl) return

    const vectorGrid = (L as any).vectorGrid

    const countyLayer = vectorGrid.protobuf(`${baseUrl}/county/{z}/{x}/{y}.pbf`, {
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
        }
      },
      interactive: true,
      getFeatureId: (f: any) => f.properties?.countyId,
    }).addTo(map)

    const townshipLayer = vectorGrid.protobuf(`${baseUrl}/township/{z}/{x}/{y}.pbf`, {
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
        }
      },
      interactive: true,
      getFeatureId: (f: any) => f.properties?.townId,
    }).addTo(map)

    countyLayerRef.current = countyLayer
    townshipLayerRef.current = townshipLayer

    // Event handlers using stable ref
    const showTip = (e: any, name: string, students: number) => {
      if (!tooltipRef.current) return
      tooltipRef.current
        .setLatLng(e.latlng)
        .setContent(buildHoverPreviewHtml(name, students))
      
      if (!map.hasLayer(tooltipRef.current)) {
        tooltipRef.current.addTo(map)
      }
    }

    const hideTip = () => { 
      if (tooltipRef.current && map.hasLayer(tooltipRef.current)) {
        tooltipRef.current.remove()
      }
    }

    countyLayer.on('mouseover', (e: any) => {
      const summary = handlersRef.current.countyLookup.get(e.layer.properties.countyId)
      if (summary) showTip(e, summary.name, summary.students)
    })
    countyLayer.on('mouseout', hideTip)
    countyLayer.on('click', (e: any) => {
      L.DomEvent.stop(e.originalEvent)
      const id = e.layer.properties.countyId
      if (id) handlersRef.current.onSelectCounty(id, { skipTabSwitch: true })
    })

    townshipLayer.on('mouseover', (e: any) => {
      const summary = handlersRef.current.townshipLookup.get(e.layer.properties.townId)
      if (summary) showTip(e, (summary as any).label ?? (summary as any).name, summary.students)
    })
    townshipLayer.on('mouseout', hideTip)
    townshipLayer.on('click', (e: any) => {
      L.DomEvent.stop(e.originalEvent)
      const id = e.layer.properties.townId
      if (id) handlersRef.current.onSelectTownship(id, { skipTabSwitch: true })
    })

    return () => {
      countyLayer.remove()
      townshipLayer.remove()
    }
  }, [map, baseUrl]) 

  // 5. Dynamic visibility & styling updates
  useEffect(() => {
    const cLayer = countyLayerRef.current
    const tLayer = townshipLayerRef.current
    if (!cLayer || !tLayer) return

    if (showCounties) {
      if (!map.hasLayer(cLayer)) cLayer.addTo(map)
    } else {
      if (map.hasLayer(cLayer)) cLayer.remove()
    }

    if (showTownships) {
      if (!map.hasLayer(tLayer)) {
        tLayer.addTo(map)
        tLayer.bringToFront() // Ensure township is always on top
      }
    } else {
      if (map.hasLayer(tLayer)) tLayer.remove()
    }
  }, [map, showCounties, showTownships])

  useEffect(() => {
    const cLayer = countyLayerRef.current
    const tLayer = townshipLayerRef.current
    if (!cLayer || !tLayer) return

    // Update County highlights
    countyLookup.forEach((summary, id) => {
      const isHovered = id === highlightedCountyId
      const isActive = id === activeCountyId
      const isVisible = isHovered || isActive
      cLayer.setFeatureStyle(id, {
        color: isVisible ? (theme === 'dark' ? '#f8fafc' : '#000000') : (theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)'),
        weight: isVisible ? 1.6 : 0.8,
        fillColor: isActive ? (theme === 'dark' ? '#10b981' : '#10b981') : choroplethColor(summary.students),
        fillOpacity: isActive ? (activeTownshipId ? 0.05 : (theme === 'dark' ? 0.4 : 0.25)) : isHovered ? 0.2 : Math.min(0.12, choroplethOpacity(summary.students)),
      })
    })

    // Update Township highlights
    const zoom = map.getZoom()
    townshipLookup.forEach((summary, id) => {
      const isHovered = id === highlightedTownshipId
      const isActive = id === activeTownshipId
      const isMarked = isHovered || isActive
      const isVisible = zoom >= 11 || isMarked
      
      tLayer.setFeatureStyle(id, {
        color: isMarked ? (theme === 'dark' ? '#f8fafc' : '#000000') : (theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'),
        weight: isMarked ? 1.6 : 0.6,
        fillColor: isActive ? '#10b981' : choroplethColor(summary.students),
        opacity: isVisible ? 1 : 0,
        fillOpacity: isVisible ? (isActive ? 0.35 : isHovered ? 0.25 : Math.max(0.04, choroplethOpacity(summary.students) - 0.06)) : 0,
      })
    })
  }, [activeCountyId, activeTownshipId, highlightedCountyId, highlightedTownshipId, countyLookup, townshipLookup, theme])

  return null
}

export default VectorTileBoundaryLayer
