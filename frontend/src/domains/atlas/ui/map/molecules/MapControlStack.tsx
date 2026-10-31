import MapFloatingHelp from './MapFloatingHelp'
import './MapControlStack.css'
import { type AtlasTab } from "@/shared/lib/atlas";
import type { ReactNode } from 'react'

type MapControlStackProps = {
  activeTab: AtlasTab
  activeCountyName: string | null
  className?: string
  legend: ReactNode
}

/**
 * Molecule: MapControlStack
 * Groups the bottom-left map controls (Filters, Mini Map, Tools) into a single vertical stack.
 * Follows Atomic Design by composing atoms and molecules.
 */
export const MapControlStack = ({
  activeTab,
  activeCountyName,
  legend,
  className = ""
}: MapControlStackProps) => {
  return (
    <div className={`map-support-controls ${className}`}>
      {/* 1. Supports Area (Left empty for layout consistency or removed) */}


      {/* 2. Map Support Tools (Help Toggle only) */}
      <div className="map-support-controls__group">
        <div className="map-support-controls__tools">
          <MapFloatingHelp 
            activeTab={activeTab} 
            activeCountyName={activeCountyName} 
            legend={legend}
          />
        </div>
      </div>
    </div>
  )
}
