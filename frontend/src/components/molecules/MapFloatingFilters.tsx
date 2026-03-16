import React from 'react'
import { AtlasPlaybackPill, AtlasLevelPill, AtlasRegionPill, AtlasTypePill } from '../AtlasGlobalFilters'
import FilterShelf from '../atoms/FilterShelf'
import MapFloatingHelp from '../map/molecules/MapFloatingHelp'
import { MapZoomControls } from '../map/atoms/MapZoomControls'
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

/**
 * Organism: MapFloatingFilters
 * Orchestrates all floating UI elements on the map (labels, filters, zoom).
 * Positioned fixed at bottom-left.
 */
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
  return (
    <div className="map-floating-filters">
      <div className="map-floating-filters__stack">
        {/* Top: Header / Help Info */}
        <MapFloatingHelp
          activeTab={activeTab}
          activeCountyName={activeCountyName}
        />

        {/* Middle: Floating Action Buttons / Shelves */}
        <div className="map-floating-filters__actions">
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
        </div>

        {/* Bottom: Zoom Controls */}
        <div className="map-floating-filters__bottom-stack">
          <MapZoomControls />
        </div>
      </div>
    </div>
  )
}

export default MapFloatingFilters
