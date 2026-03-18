import { useEffect, useRef } from 'react'
import type { EducationSummaryDataset, RegionGroupFilter, SchoolCodeEntry } from '../data/educationData'
import type { AtlasTab } from './useAtlasQueryState'

type SearchNavigationArgs = {
  summaryDataset: EducationSummaryDataset | null
  deferredSearchText: string
  startTransition: (scope: () => void) => void
  setSelectedCountyId: (id: string | null) => void
  setRegion: (region: RegionGroupFilter) => void
  setSelectedTownshipId: (id: string | null) => void
  setSelectedSchoolId: (id: string | null) => void
  setMapLat: (lat: number | null) => void
  setMapLon: (lon: number | null) => void
  setMapZoom: import('react').Dispatch<import('react').SetStateAction<number | null>>
  setActiveTab: (tab: AtlasTab, scrollHeight?: number) => void
}

/**
 * Molecule Hook: Handles automated navigation when search text matches specific entities.
 * (Numeric school codes or unique fuzzy name matches).
 */
export function useAtlasSearchNavigation({
  summaryDataset,
  deferredSearchText,
  startTransition,
  setSelectedCountyId,
  setRegion,
  setSelectedTownshipId,
  setSelectedSchoolId,
  setMapLat,
  setMapLon,
  setMapZoom,
  setActiveTab,
}: SearchNavigationArgs) {
  const lastCodeNavRef = useRef<string>('')

  useEffect(() => {
    const query = deferredSearchText.trim()
    if (query.length < 2 || query === lastCodeNavRef.current) return
    
    lastCodeNavRef.current = query
    const index = summaryDataset?.schoolCodeIndex
    if (!index) return

    startTransition(() => {
      // 1. Try numeric code match (Exact ID match)
      if (/^\d{4,}$/.test(query)) {
        const entry = index[query]
        if (entry) {
          performTargetNavigation(entry, query)
          return
        }
      }

      // 2. Try unique fuzzy name match
      if (query.length >= 2 && !/^\d+$/.test(query)) {
        const matches = Object.values(index).filter(entry => 
          entry.name?.includes(query) || (entry.schoolIds?.[0]?.includes(query))
        )
        
        if (matches.length === 1) {
          performTargetNavigation(matches[0], query)
        }
      }
    })

    function performTargetNavigation(entry: SchoolCodeEntry, originalId: string) {
      const nextCountyId = entry.countyId ?? entry.countyCode ?? null
      const nextTownshipId = entry.townshipId ?? entry.townCode ?? null
      
      setSelectedCountyId(nextCountyId)
      setRegion('全部')
      setSelectedTownshipId(nextTownshipId)
      setSelectedSchoolId(entry.schoolIds?.[0] ?? originalId)
      
      if (entry.latitude && entry.longitude) {
        setMapLat(entry.latitude)
        setMapLon(entry.longitude)
        setMapZoom((prev) => Math.max(prev ?? 0, 13))
      }
      setActiveTab('school-focus', 0)
    }
  }, [
    deferredSearchText, 
    summaryDataset, 
    startTransition, 
    setSelectedCountyId, 
    setSelectedTownshipId, 
    setSelectedSchoolId, 
    setRegion, 
    setMapLat, 
    setMapLon, 
    setMapZoom, 
    setActiveTab
  ])
}
