import { CountyBoundaryLayer } from './CountyBoundaryLayer'
import { TownshipBoundaryLayer } from './TownshipBoundaryLayer'
import { CountyMarkerLayer } from './CountyMarkerLayer'
import AllTownshipLabels from './AllTownshipLabels'
import VisibleSchoolMarkers from './VisibleSchoolMarkers'
import VectorTileBoundaryLayer from './VectorTileBoundaryLayer'
import type { 
  CountyBoundaryCollection, 
  TownshipBoundaryCollection,
  CountyBucketDataset 
} from '../../../data/educationData'
import type { 
  CountySummary, 
  RankingSummary 
} from '../../../lib/analytics.types'
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
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  allTownshipBoundaries: TownshipBoundaryCollection | null
  schoolPoints: SchoolMapPoint[]
  countyBuckets: CountyBucketDataset | null
  counties: CountySummary[]
  countyLookup: Map<string, any>
  townshipLookup: Map<string, any>
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

export function MapLayerStack(props: LayerStackProps) {
  const {
    theme, activeCountyId, activeTownshipId, hoveredCountyId, hoveredTownshipId,
    highlightedCountyId, highlightedTownshipId, highlightedSchoolId, selectedSchoolId,
    countyBoundaries, townshipBoundaries, allTownshipBoundaries, schoolPoints,
    countyBuckets, countyLookup, townshipLookup, allTownshipRows,
    visibleTownshipRows, countyCenterLookup, showCountyMarkers, showTownshipMarkers,
    showSchoolMarkers, currentMapZoom, forceTownshipLabels, vectorTileBaseUrl,
    onSelectCounty, onSelectTownship, onSelectSchool, onHoverCounty,
    setHoveredCountyId, setHoveredTownshipId, onVectorTileError
  } = props

  return (
    <>
      {vectorTileBaseUrl ? (
        <VectorTileBoundaryLayer
          baseUrl={vectorTileBaseUrl}
          onError={onVectorTileError}
          activeCountyId={activeCountyId}
          activeTownshipId={activeTownshipId}
          highlightedCountyId={highlightedCountyId}
          highlightedTownshipId={highlightedTownshipId}
          onSelectCounty={onSelectCounty}
          onSelectTownship={onSelectTownship}
          countyLookup={countyLookup}
          townshipLookup={new Map(allTownshipRows.map((t) => [t.id, t]))}
        />
      ) : (
        <>
          <CountyBoundaryLayer
            countyBoundaries={countyBoundaries}
            countyLookup={countyLookup}
            activeCountyId={activeCountyId}
            hoveredFeatureId={hoveredCountyId}
            highlightedCountyId={highlightedCountyId}
            theme={theme}
            showMarkers={showCountyMarkers}
            onSelectCounty={onSelectCounty}
            onHoverCounty={onHoverCounty}
            setHoveredFeatureId={setHoveredCountyId}
          />
          {townshipBoundaries && (
            <TownshipBoundaryLayer
              data={townshipBoundaries}
              townshipLookup={townshipLookup}
              activeTownshipId={activeTownshipId}
              hoveredFeatureId={hoveredTownshipId}
              highlightedTownshipId={highlightedTownshipId}
              theme={theme}
              showMarkers={showTownshipMarkers}
              onSelectTownship={onSelectTownship}
              setHoveredFeatureId={setHoveredTownshipId}
            />
          )}
        </>
      )}

      <CountyMarkerLayer
        counties={props.counties}
        countyCenterLookup={countyCenterLookup}
        countyBoundaries={countyBoundaries}
        currentMapZoom={currentMapZoom}
        activeCountyId={activeCountyId}
        onSelectCounty={onSelectCounty}
        showMarkers={showCountyMarkers}
      />

      <AllTownshipLabels
        onSelectTownship={onSelectTownship}
        hiddenTownshipId={activeTownshipId}
        visibleTownshipIds={showTownshipMarkers ? visibleTownshipRows.map((r) => r.id) : []}
        forceShowAll={forceTownshipLabels}
        townshipBoundaries={allTownshipBoundaries}
        currentZoom={currentMapZoom}
        townshipLookup={townshipLookup}
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
    </>
  )
}
