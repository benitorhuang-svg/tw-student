import { useState } from 'react'
import { useAtlasTabState, type AtlasTab } from './useAtlasQueryState'

/**
 * Atom Hook: Manages selection hierarchy and map view state.
 */
export function useNavigationAppState(initial: {
  selectedCountyId: string | null
  selectedTownshipId: string | null
  selectedSchoolId: string | null
  tab: AtlasTab
  zoom: number | null
  lat: number | null
  lon: number | null
  tabIsExplicit: boolean
  forceTownshipLabels: boolean
}) {
  const [selectedCountyId, setSelectedCountyId] = useState<string | null>(initial.selectedCountyId)
  const [selectedTownshipId, setSelectedTownshipId] = useState<string | null>(initial.selectedTownshipId)
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(initial.selectedSchoolId)

  const { activeTab, setActiveTab, sidebarRef } = useAtlasTabState(initial.tab)
  const [tabIsExplicitFromQuery] = useState(initial.tabIsExplicit)
  const [mapResetToken, setMapResetToken] = useState(0)
  
  const [mapZoom, setMapZoom] = useState<number | null>(initial.zoom)
  const [mapLat, setMapLat] = useState<number | null>(initial.lat)
  const [mapLon, setMapLon] = useState<number | null>(initial.lon)
  const [forceTownshipLabels, setForceTownshipLabels] = useState<boolean>(initial.forceTownshipLabels)

  return {
    selectedCountyId, setSelectedCountyId,
    selectedTownshipId, setSelectedTownshipId,
    selectedSchoolId, setSelectedSchoolId,
    activeTab, setActiveTab, sidebarRef,
    tabIsExplicitFromQuery,
    mapResetToken, setMapResetToken,
    mapZoom, setMapZoom,
    mapLat, setMapLat,
    mapLon, setMapLon,
    forceTownshipLabels, setForceTownshipLabels,
  }
}
