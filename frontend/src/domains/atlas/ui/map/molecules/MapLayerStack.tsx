import { memo, useCallback, useMemo } from 'react'
import { CountyMarkerLayer } from './CountyMarkerLayer'
import AllTownshipLabels from './AllTownshipLabels'
import VisibleSchoolMarkers from './VisibleSchoolMarkers'
import VectorTileBoundaryLayer from './VectorTileBoundaryLayer'
import { StarMarker } from '../atoms/StarMarker'
import { buildSchoolMarkerAriaLabel, renderSchoolHoverCard } from '../atoms/MapHoverCard'
import type { 
  CountyBoundaryCollection, 
  TownshipBoundaryCollection,
  CountyBucketDataset 
} from '@/shared/api/data/educationData'
import type { 
  CountySummary, 
  RankingSummary 
} from '@/shared/lib/analytics'
import type { SchoolMapPoint } from '../types'

type LayerStackProps = {
  theme: 'light' | 'dark'
  activeCountyId: string | null
  activeTownshipId: string | null
  hoveredCountyId: string | null
  hoveredTownshipId: string | null
  highlightedCountyId: string | null
  highlightedTownshipId: string | null
  highlightedSchoolId: string | null
  selectedSchoolId: string | null
  selectedSchoolPoint: SchoolMapPoint | null
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  allTownshipBoundaries: TownshipBoundaryCollection | null
  schoolPoints: SchoolMapPoint[]
  countyBuckets: CountyBucketDataset | null
  counties: CountySummary[]
  countyLookup: Map<string, CountySummary>
  townshipLookup: Map<string, RankingSummary>
  allTownshipRows: RankingSummary[]
  visibleTownshipRows: RankingSummary[]
  countyCenterLookup: Map<string, [number, number]>
  showCountyMarkers: boolean
  showTownshipMarkers: boolean
  showSchoolMarkers: boolean
  currentMapZoom: number | null
  forceTownshipLabels: boolean
  vectorTileBaseUrl: string
  onSelectCounty: (id: string, options?: { skipTabSwitch?: boolean }) => void
  onSelectTownship: (id: string, options?: { skipTabSwitch?: boolean }) => void
  onSelectSchool: (id: string | null) => void
  onHoverCounty: (id: string | null) => void
  setHoveredCountyId: (id: string | null) => void
  setHoveredTownshipId: (id: string | null) => void
  onVectorTileError: () => void
}

export const MapLayerStack = memo(function MapLayerStack(props: LayerStackProps) {
  const {
    theme, activeCountyId, activeTownshipId,
    highlightedCountyId, highlightedTownshipId, highlightedSchoolId, selectedSchoolId,
    selectedSchoolPoint,
    countyBoundaries, townshipBoundaries, allTownshipBoundaries, schoolPoints,
    countyBuckets, countyLookup, townshipLookup, allTownshipRows,
    visibleTownshipRows, countyCenterLookup, showCountyMarkers, showTownshipMarkers,
    showSchoolMarkers, currentMapZoom, forceTownshipLabels,
    onSelectCounty, onSelectTownship, onSelectSchool, onHoverCounty,
  } = props

  const vectorTownshipLookup = useMemo(
    () => new Map(allTownshipRows.map((township) => [township.id, township])),
    [allTownshipRows],
  )
  const visibleTownshipIds = useMemo(
    () => (showTownshipMarkers ? visibleTownshipRows.map((row) => row.id) : []),
    [showTownshipMarkers, visibleTownshipRows],
  )

  // NO-OP tooltip functions: intentionally disable global map hover tooltip.
  const showMapTooltip = useCallback(() => {
    // intentionally empty
  }, [])

  const hideMapTooltip = useCallback(() => {
    // intentionally empty
  }, [])

  return (
    <>
      <VectorTileBoundaryLayer
        theme={theme}
        countyBoundaries={countyBoundaries}
        townshipBoundaries={townshipBoundaries}
        activeCountyId={activeCountyId}
        activeTownshipId={activeTownshipId}
        highlightedCountyId={highlightedCountyId}
        highlightedTownshipId={highlightedTownshipId}
        onSelectCounty={onSelectCounty}
        onSelectTownship={onSelectTownship}
        countyLookup={countyLookup}
        townshipLookup={vectorTownshipLookup}
        showCounties={showCountyMarkers}
        showTownships={showTownshipMarkers}
      />

      <CountyMarkerLayer
        counties={props.counties}
        countyCenterLookup={countyCenterLookup}
        countyBoundaries={countyBoundaries}
        currentMapZoom={currentMapZoom}
        activeCountyId={activeCountyId}
        onSelectCounty={onSelectCounty}
        showMarkers={showCountyMarkers}
        onHoverCounty={onHoverCounty}
        showMapTooltip={showMapTooltip}
        hideMapTooltip={hideMapTooltip}
      />

      <AllTownshipLabels
        onSelectTownship={onSelectTownship}
        hiddenTownshipId={null}
        visibleTownshipIds={visibleTownshipIds}
        forceShowAll={forceTownshipLabels}
        townshipBoundaries={allTownshipBoundaries}
        currentZoom={currentMapZoom}
        townshipLookup={townshipLookup}
        selectedTownshipId={activeTownshipId}
        showMapTooltip={showMapTooltip}
        hideMapTooltip={hideMapTooltip}
      />

      {showSchoolMarkers && (
        <VisibleSchoolMarkers
          countyBuckets={countyBuckets}
          schoolPoints={schoolPoints}
          selectedSchoolId={selectedSchoolId}
          highlightedSchoolId={highlightedSchoolId}
          onSelectSchool={onSelectSchool}
        />
      )}

      {/* Global Selection Marker Molecule: Combines Star, Dot, and Pulse to prevent drift */}
      {selectedSchoolPoint && (
        <StarMarker
          position={[selectedSchoolPoint.latitude, selectedSchoolPoint.longitude]}
          isSelected={true}
          deltaRatio={selectedSchoolPoint.deltaRatio}
          zoom={currentMapZoom ?? 11}
          size={36}
          color="#fbbf24"
          ariaLabel={buildSchoolMarkerAriaLabel(selectedSchoolPoint)}
          onActivate={() => onSelectSchool(selectedSchoolPoint.id)}
          tooltipContent={renderSchoolHoverCard(selectedSchoolPoint)}
        />
      )}
    </>
  )
})
