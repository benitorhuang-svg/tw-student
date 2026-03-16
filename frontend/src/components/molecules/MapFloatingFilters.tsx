import React from 'react'
import type { EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../../data/educationData'

type MapFloatingFiltersProps = {
  region: RegionGroupFilter
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
}

/**
 * Organism: MapFloatingFilters
 * Orchestrates all floating UI elements on the map (labels, filters, zoom).
 * Positioned fixed at bottom-left.
 */
export const MapFloatingFilters: React.FC<MapFloatingFiltersProps> = () => {
  return (
    <div className="map-floating-filters">
      <div className="map-floating-filters__stack">
        {/* Floating filters moved or removed */}
      </div>
    </div>
  )
}

export default MapFloatingFilters
