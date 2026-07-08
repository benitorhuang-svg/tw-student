import VectorCountyBoundaryLayer from './VectorCountyBoundaryLayer'
import VectorTownshipBoundaryLayer from './VectorTownshipBoundaryLayer'
import type { CountySummary, RankingSummary } from '@/shared/lib/analytics'
import type { CountyBoundaryCollection, TownshipBoundaryCollection } from '@/shared/api/data/educationData'

export type VectorTileBoundaryLayerProps = {
  theme: 'light' | 'dark'
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
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
  countyBoundaries,
  townshipBoundaries,
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


  return (
    <>
      <VectorCountyBoundaryLayer
        theme={theme}
        data={countyBoundaries}
        activeCountyId={activeCountyId}
        activeTownshipId={activeTownshipId}
        highlightedCountyId={highlightedCountyId}
        onSelectCounty={onSelectCounty}
        countyLookup={countyLookup}
        visible={showCounties}
      />
      {townshipBoundaries && (
        <VectorTownshipBoundaryLayer
          theme={theme}
          data={townshipBoundaries}
          activeTownshipId={activeTownshipId}
          highlightedTownshipId={highlightedTownshipId}
          onSelectTownship={onSelectTownship}
          townshipLookup={townshipLookup}
          visible={showTownships}
        />
      )}
    </>
  )
}

export default VectorTileBoundaryLayer

