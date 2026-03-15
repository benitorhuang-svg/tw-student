import { AtlasPlaybackPill, AtlasLevelPill, AtlasRegionPill, AtlasTypePill } from '../AtlasGlobalFilters'
import FilterShelf from '../atoms/FilterShelf'
import MapFloatingHelp from '../map/molecules/MapFloatingHelp'
import { useMap } from 'react-leaflet'
import type { AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../../data/educationData'
import type { AtlasTab } from '../../hooks/useAtlasQueryState'

type MapFloatingFiltersProps = {
  activeTab: AtlasTab
  activeCountyName: string | null
  region: RegionGroupFilter
  activeYear: AcademicYear
  summaryYears: AcademicYear[]
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  isYearPlaybackActive: boolean
  openShelf: string | null
  onToggleShelf: (id: string) => void
  onSetRegion: (r: RegionGroupFilter) => void
  onResetRegion: () => void
  onTogglePlayback: () => void
  onSetActiveYear: (year: AcademicYear) => void
  onStopPlayback: () => void
  onSetEducationLevel: (level: EducationLevelFilter) => void
  onSetManagementType: (type: ManagementTypeFilter) => void
  startTransition: React.TransitionStartFunction
}

export const MapFloatingFilters: React.FC<MapFloatingFiltersProps> = ({
  activeTab,
  activeCountyName,
  region,
  activeYear,
  summaryYears,
  educationLevel,
  managementType,
  isYearPlaybackActive,
  openShelf,
  onToggleShelf,
  onSetRegion,
  onResetRegion,
  onTogglePlayback,
  onSetActiveYear,
  onStopPlayback,
  onSetEducationLevel,
  onSetManagementType,
  startTransition
}) => {
  const map = useMap()

  return (
    <div className="map-floating-filters">
      <div className="map-floating-filters__stack">
        <MapFloatingHelp
          activeTab={activeTab}
          activeCountyName={activeCountyName}
        />

        <FilterShelf
          id="region"
          isOpen={openShelf === 'region'}
          onToggle={onToggleShelf}
          isModified={region !== '全部'}
          icon={(
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          )}
        >
          <div className="map-floating-filters__group--region-expanded">
            <AtlasRegionPill
              region={region}
              onSetRegion={onSetRegion}
              startTransition={startTransition}
              onReset={onResetRegion}
            />
          </div>
        </FilterShelf>

        <FilterShelf
          id="playback"
          isOpen={openShelf === 'playback'}
          onToggle={onToggleShelf}
          isModified={summaryYears.length > 0 && activeYear !== summaryYears[summaryYears.length - 1]}
          icon={(
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          )}
        >
          <div className="map-floating-filters__group map-floating-filters__group--playback">
            <AtlasPlaybackPill
              isYearPlaybackActive={isYearPlaybackActive}
              onTogglePlayback={onTogglePlayback}
              activeYear={activeYear}
              summaryYears={summaryYears}
              onSetActiveYear={onSetActiveYear}
              onStopPlayback={onStopPlayback}
              startTransition={startTransition}
            />
          </div>
        </FilterShelf>

        <FilterShelf
          id="level"
          isOpen={openShelf === 'level'}
          onToggle={onToggleShelf}
          isModified={educationLevel !== '全部'}
          icon={(
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          )}
        >
          <div className="map-floating-filters__group">
            <AtlasLevelPill
              educationLevel={educationLevel}
              onSetEducationLevel={onSetEducationLevel}
              startTransition={startTransition}
            />
          </div>
        </FilterShelf>

        <FilterShelf
          id="type"
          isOpen={openShelf === 'type'}
          onToggle={onToggleShelf}
          isModified={managementType !== '全部'}
          icon={(
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7M4 21V7m16 14V7" />
            </svg>
          )}
        >
          <div className="map-floating-filters__group">
            <AtlasTypePill
              managementType={managementType}
              onSetManagementType={onSetManagementType}
              startTransition={startTransition}
            />
          </div>
        </FilterShelf>

        <div className="map-zoom-controls">
          <button 
            type="button"
            className="map-zoom-btn" 
            onClick={() => map.zoomIn()}
            title="放大"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button 
            type="button"
            className="map-zoom-btn" 
            onClick={() => map.zoomOut()}
            title="縮小"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MapFloatingFilters
