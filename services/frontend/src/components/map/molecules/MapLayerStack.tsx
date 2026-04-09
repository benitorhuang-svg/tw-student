import { memo, useCallback, useEffect, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { CountyBoundaryLayer } from './CountyBoundaryLayer'
import { TownshipBoundaryLayer } from './TownshipBoundaryLayer'
import { CountyMarkerLayer } from './CountyMarkerLayer'
import AllTownshipLabels from './AllTownshipLabels'
import VisibleSchoolMarkers from './VisibleSchoolMarkers'
import CanvasSchoolLayer from './CanvasSchoolLayer'
import VectorTileBoundaryLayer from './VectorTileBoundaryLayer'
import { StarMarker } from '../atoms/StarMarker'
import { buildSchoolMarkerAriaLabel, renderSchoolHoverCard } from '../atoms/MapHoverCard'
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
    theme, activeCountyId, activeTownshipId, hoveredCountyId, hoveredTownshipId,
    highlightedCountyId, highlightedTownshipId, highlightedSchoolId, selectedSchoolId,
    selectedSchoolPoint,
    countyBoundaries, townshipBoundaries, allTownshipBoundaries, schoolPoints,
    countyBuckets, countyLookup, townshipLookup, allTownshipRows,
    visibleTownshipRows, countyCenterLookup, showCountyMarkers, showTownshipMarkers,
    showSchoolMarkers, currentMapZoom, forceTownshipLabels, vectorTileBaseUrl,
    onSelectCounty, onSelectTownship, onSelectSchool, onHoverCounty,
    setHoveredCountyId, setHoveredTownshipId, onVectorTileError
  } = props

  const map = useMap()


  const vectorTownshipLookup = useMemo(
    () => new Map(allTownshipRows.map((township) => [township.id, township])),
    [allTownshipRows],
  )
  const visibleTownshipIds = useMemo(
    () => (showTownshipMarkers ? visibleTownshipRows.map((row) => row.id) : []),
    [showTownshipMarkers, visibleTownshipRows],
  )

  useEffect(() => {
    // Disable global map tooltip: keep tooltipRef but do not create a Leaflet tooltip.
    // This prevents the duplicate "map hover" tooltip that previously appeared
    // alongside county/township marker hovers. Components still receive
    // `showMapTooltip`/`hideMapTooltip` props but those are no-ops below.
    return () => {}
  }, [map])

  // NO-OP tooltip functions: intentionally disable global map hover tooltip.
  const showMapTooltip = useCallback((_latlng: L.LatLng, _content: string) => {
    // intentionally empty
  }, [])

  const hideMapTooltip = useCallback(() => {
    // intentionally empty
  }, [])

  return (
    <>
      {vectorTileBaseUrl ? (
        <VectorTileBoundaryLayer
          theme={theme}
          baseUrl={vectorTileBaseUrl}
          onError={onVectorTileError}
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
      ) : (
        <>
          <CountyBoundaryLayer
            countyBoundaries={countyBoundaries}
            countyLookup={countyLookup}
            activeCountyId={activeCountyId}
            activeTownshipId={activeTownshipId}
            hoveredFeatureId={hoveredCountyId}
            highlightedCountyId={highlightedCountyId}
            theme={theme}
            onSelectCounty={onSelectCounty}
            onHoverCounty={onHoverCounty}
            setHoveredFeatureId={setHoveredCountyId}
            showMapTooltip={showMapTooltip}
            hideMapTooltip={hideMapTooltip}
          />
          {townshipBoundaries && showTownshipMarkers && (
            <TownshipBoundaryLayer
              data={townshipBoundaries}
              townshipLookup={townshipLookup}
              activeTownshipId={activeTownshipId}
              hoveredFeatureId={hoveredTownshipId}
              highlightedTownshipId={highlightedTownshipId}
              theme={theme}
              onSelectTownship={onSelectTownship}
              setHoveredFeatureId={setHoveredTownshipId}
              showMapTooltip={showMapTooltip}
              hideMapTooltip={hideMapTooltip}
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
        (import.meta.env.VITE_CANVAS_MARKERS === 'true') ? (
          <CanvasSchoolLayer
            schoolPoints={schoolPoints}
            selectedSchoolId={selectedSchoolId}
            highlightedSchoolId={highlightedSchoolId}
            onSelectSchool={onSelectSchool}
          />
        ) : (
          <VisibleSchoolMarkers
            countyBuckets={countyBuckets}
            schoolPoints={schoolPoints}
            selectedSchoolId={selectedSchoolId}
            highlightedSchoolId={highlightedSchoolId}
            onSelectSchool={onSelectSchool}
          />
        )
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
