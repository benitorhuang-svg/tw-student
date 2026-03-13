import { useEffect } from 'react'
import L from 'leaflet'
// leaflet.vectorgrid ships only UMD; import bundled file directly so
// Vite can resolve it.  the package.json `main` points to a CJS entry that
// Vite's import-analysis sometimes fails on.
import 'leaflet.vectorgrid/dist/Leaflet.VectorGrid.bundled.min.js'
import { useMap } from 'react-leaflet'
import type { CountySummary, RankingSummary } from '../../../lib/analytics'

// Minimal typing for the vectorGrid plugin; we avoid using `any` so lint stays clean.
type VectorGridFeature = { properties?: { countyId?: string; townId?: string } }

type VectorGridLayer = {
  protobuf: (
    url: string,
    options: {
      vectorTileLayerStyles: Record<string, (properties: unknown) => L.PathOptions>
      interactive: boolean
      getFeatureId: (f: VectorGridFeature) => string | undefined
    },
  ) => L.Layer
}
import {
  choroplethColor,
  choroplethOpacity,
} from '../mapStyles'

export type VectorTileBoundaryLayerProps = {
  baseUrl: string // URL prefix under which {layer}/{z}/{x}/{y}.pbf tiles live
  onError?: () => void // called if tiles cannot be loaded
  activeCountyId: string | null
  activeTownshipId: string | null
  highlightedCountyId?: string | null
  highlightedTownshipId?: string | null
  onSelectCounty: (countyId: string, options?: { skipTabSwitch?: boolean }) => void
  onSelectTownship: (townshipId: string, options?: { skipTabSwitch?: boolean }) => void
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

  // ensure the tile service is reachable before adding layers; fall back on
  // error event as well.  this prevents the blank‑canvas case when the URL is
  // mis‑configured or the server is down.
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

  useEffect(() => {
    if (!map || !baseUrl) return

    const countyStyle = (properties: unknown) => {
      const props = properties as { countyId?: string }
      const countyId = props.countyId as string
      const summary = countyLookup.get(countyId) ?? null
      const isHovered = countyId === highlightedCountyId
      if (!summary || summary.filteredOut) {
        return {
          color: 'rgba(0,0,0,0.2)',
          weight: 0.8,
          fillColor: 'transparent',
          fillOpacity: 0,
        }
      }
      const baseStroke = 'rgba(0,0,0,0.2)'
      const highlightStroke = '#000000'
      const baseWeight = 0.8
      const highlightWeight = 1.6
      return {
        color: isHovered ? highlightStroke : baseStroke,
        weight: isHovered ? highlightWeight : baseWeight,
        fillColor: choroplethColor(summary.students),
        fillOpacity: Math.min(0.12, choroplethOpacity(summary.students)),
      }
    }

    const townshipStyle = (properties: unknown) => {
      const props = properties as { townId?: string }
      const townId = props.townId as string
      const summary = townshipLookup.get(townId) ?? null
      const isActive = townId === activeTownshipId
      const isHovered = townId === highlightedTownshipId
      const baseStroke = 'rgba(0,0,0,0.15)'
      const highlightStroke = '#000000'
      const baseWeight = 0.7
      const highlightWeight = 1.4
      return {
        color: isActive || isHovered ? highlightStroke : baseStroke,
        weight: isActive || isHovered ? highlightWeight : baseWeight,
        fillColor: isActive ? '#cfe6d3' : choroplethColor(summary?.students ?? 0),
        fillOpacity: summary ? Math.max(0.05, choroplethOpacity(summary.students) - 0.06) : 0.04,
      }
    }

    const vectorGrid = (L as unknown as { vectorGrid: VectorGridLayer }).vectorGrid

    const countyLayer = vectorGrid
      .protobuf(`${baseUrl}/county/{z}/{x}/{y}.pbf`, {
        vectorTileLayerStyles: {
          county: countyStyle,
        },
        interactive: true,
        getFeatureId: (f) => f.properties?.countyId,
      })
      .addTo(map)

    const townshipLayer = vectorGrid
      .protobuf(`${baseUrl}/township/{z}/{x}/{y}.pbf`, {
        vectorTileLayerStyles: {
          township: townshipStyle,
        },
        interactive: true,
        getFeatureId: (f) => f.properties?.townId,
      })
      .addTo(map)

    // if the tile server is unreachable we want to silently fall back to
    // regular GeoJSON proxies (caller can detect absence of vector URL and
    // re-render accordingly).  vectorGrid emits a "tileerror" event on the
    // leaflet map when pbf fetch fails.
    const handleTileError = () => {
      countyLayer.remove()
      townshipLayer.remove()
      console.warn('[VectorTileBoundaryLayer] tile fetch failed; removing layer')
      if (onError) onError()
    }
    map.on('tileerror', handleTileError)

    countyLayer.on('click', (e: { layer?: { properties?: { countyId?: string } } }) => {
      const id = e.layer?.properties?.countyId
      if (id) onSelectCounty(id, { skipTabSwitch: true })
    })
    townshipLayer.on('click', (e: { layer?: { properties?: { townId?: string } } }) => {
      const id = e.layer?.properties?.townId
      if (id) onSelectTownship(id, { skipTabSwitch: true })
    })

    return () => {
      countyLayer.remove()
      townshipLayer.remove()
    }
  }, [map, baseUrl, countyLookup, townshipLookup, activeCountyId, activeTownshipId, highlightedCountyId, highlightedTownshipId, onSelectCounty, onSelectTownship, onError])

  return null
}

export default VectorTileBoundaryLayer
