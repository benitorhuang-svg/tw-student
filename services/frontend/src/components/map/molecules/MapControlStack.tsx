import MapFloatingHelp from './MapFloatingHelp'
import type { AtlasTab } from '../../../hooks/useAtlasQueryState'
import styles from './MapControlStack.module.css'

type MapControlStackProps = {
  activeTab: AtlasTab
  activeCountyName: string | null
  className?: string
}

/**
 * Molecule: MapControlStack
 * Groups the bottom-left map controls (Filters, Mini Map, Tools) into a single vertical stack.
 * Follows Atomic Design by composing atoms and molecules.
 */
export const MapControlStack = ({
  activeTab,
  activeCountyName,
  className = ""
}: MapControlStackProps) => {
  return (
    <div className={`${styles['map-bottom-left-stack']} ${className}`}>
      {/* 1. Supports Area (Left empty for layout consistency or removed) */}


      {/* 2. Map Support Tools (Help Toggle only) */}
      <div className={styles['map-control-group']}>
        <div className={styles['map-detached-controls']}>
          <MapFloatingHelp 
            activeTab={activeTab} 
            activeCountyName={activeCountyName} 
          />
        </div>
      </div>
    </div>
  )
}
