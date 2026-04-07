import { useEffect } from 'react'
import VectorCountyBoundaryLayer from './VectorCountyBoundaryLayer'
import VectorTownshipBoundaryLayer from './VectorTownshipBoundaryLayer'
import type { CountySummary, RankingSummary } from '../../../lib/analytics'

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

/**
 * Molecule: VectorTileBoundaryLayer
 * Composes specialized boundary layers into a single map feature set.
 * Follows Atomic Design by orchestrating County and Township molecules.
 */
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
  
  // Preflight check still relevant for the group
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

  return (
    <>
      <VectorCountyBoundaryLayer
        theme={theme}
        baseUrl={baseUrl}
        activeCountyId={activeCountyId}
        activeTownshipId={activeTownshipId}
        highlightedCountyId={highlightedCountyId}
        onSelectCounty={onSelectCounty}
        countyLookup={countyLookup}
        visible={showCounties}
      />
      <VectorTownshipBoundaryLayer
        theme={theme}
        baseUrl={baseUrl}
        activeTownshipId={activeTownshipId}
        highlightedTownshipId={highlightedTownshipId}
        onSelectTownship={onSelectTownship}
        townshipLookup={townshipLookup}
        visible={showTownships}
      />
    </>
  )
}

export default VectorTileBoundaryLayer

