import { AtlasMiniMap } from './AtlasMiniMap'
import { MapYearLabel } from '../atoms/MapYearLabel'
import MapBreadcrumb from '../atoms/MapBreadcrumb'
import MapFloatingHelp from './MapFloatingHelp'
import { MapZoomControls } from '../atoms/MapZoomControls'
import type { CountyBoundaryCollection, AcademicYear } from '../../../data/educationData'
import type { AtlasTab } from '../../../hooks/useAtlasQueryState'
import styles from './MapControlStack.module.css'

type MapControlStackProps = {
  // MiniMap Props
  countyBoundaries: CountyBoundaryCollection
  activeCountyId: string | null
  onSelectCounty: (countyId: string) => void
  scopePath: string[]
  onNavigateScope: (depth: number) => void
  activeTab: AtlasTab
  activeCountyName: string | null
  activeYear: AcademicYear
}

/**
 * Organism: MapControlStack
 * Groups the left-side map controls (Year, Filters, Mini Map) into a single vertical stack.
 * Follows Atomic Design by composing atoms and molecules.
 */
export const MapControlStack = ({
  countyBoundaries,
  activeCountyId,
  onSelectCounty,
  scopePath,
  onNavigateScope,
  activeTab,
  activeCountyName,
  activeYear
}: MapControlStackProps) => {
  return (
    <div className={styles['top-left-context']}>
      {/* 1. Year Indicator (Top) */}
      <MapYearLabel activeYear={activeYear} style={{ animationDelay: '0.05s' }} />

      {/* 2. Breadcrumb Navigation (Middle) */}
      <MapBreadcrumb scopePath={scopePath} onNavigate={onNavigateScope} />

      {/* 3. Bottom Section: Discovery Tool */}
      <div className={styles['control-group']}>
        <AtlasMiniMap 
          countyBoundaries={countyBoundaries as any}
          activeCountyId={activeCountyId}
          onSelectCounty={onSelectCounty}
          isVisible={true}
          style={{ animationDelay: '0.15s' }}
        />
        
        {/* 4. Detached Controls Container */}
        <div className={styles['detached-controls']}>
          <MapFloatingHelp 
            activeTab={activeTab} 
            activeCountyName={activeCountyName} 
          />
          <MapZoomControls />
        </div>
      </div>
    </div>
  )
}
