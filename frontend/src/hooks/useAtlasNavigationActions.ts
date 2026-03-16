import { type Dispatch, type SetStateAction, type TransitionStartFunction } from 'react'
import type { 
  RegionGroupFilter, 
  EducationSummaryDataset 
} from '../data/educationData'
import { MAP_TOWNSHIP_ZOOM, MAP_TOWNSHIP_FOCUS_ZOOM } from '../lib/constants'
import type { AtlasTab } from './useAtlasQueryState'

type NavigationActionsArgs = {
  summaryDataset: EducationSummaryDataset | null
  region: RegionGroupFilter
  selectedCountyId: string | null
  selectedTownshipId: string | null
  selectedSchoolId: string | null
  setRegion: Dispatch<SetStateAction<RegionGroupFilter>>
  setSelectedCountyId: Dispatch<SetStateAction<string | null>>
  setSelectedTownshipId: Dispatch<SetStateAction<string | null>>
  setSelectedSchoolId: Dispatch<SetStateAction<string | null>>
  setMapResetToken: Dispatch<SetStateAction<number>>
  setMapZoom: Dispatch<SetStateAction<number | null>>
  setMapLat: Dispatch<SetStateAction<number | null>>
  setMapLon: Dispatch<SetStateAction<number | null>>
  setActiveTab: (tab: AtlasTab, scrollTop?: number) => void
  clearCountyDetailError: () => void
  startTransition: TransitionStartFunction
}

export function useAtlasNavigationActions({
  summaryDataset,
  region,
  selectedCountyId,
  selectedSchoolId,
  setRegion,
  setSelectedCountyId,
  setSelectedTownshipId,
  setSelectedSchoolId,
  setMapResetToken,
  setMapZoom,
  setMapLat,
  setMapLon,
  setActiveTab,
  clearCountyDetailError,
  startTransition,
}: NavigationActionsArgs) {
  
  const handleRegionSelect = (nextRegion: RegionGroupFilter, options?: { skipTabSwitch?: boolean, zoom?: number }) => {
    const shouldResetRegion = region === nextRegion && !selectedCountyId

    startTransition(() => {
      setRegion(shouldResetRegion ? '全部' : nextRegion)
      setSelectedCountyId(null)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      if (options?.zoom) {
        setMapZoom((curr) => Math.max(curr ?? 0, options.zoom!))
      }
      clearCountyDetailError()
      setMapResetToken((current) => current + 1)
    })
  }

  const handleCountySelect = (countyId: string, options?: { skipTabSwitch?: boolean, zoom?: number }) => {
    startTransition(() => {
      setSelectedCountyId(countyId)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      if (options?.zoom != null) {
        setMapZoom((curr) => Math.max(curr ?? 0, options.zoom!))
      } else {
        setMapZoom((curr) => Math.max(curr ?? 0, MAP_TOWNSHIP_ZOOM))
      }
      clearCountyDetailError()
    })

    if (!options?.skipTabSwitch) {
      setActiveTab('county', 0)
    }
  }

  const ensureCountySelected = (countyId: string) => {
    if (selectedCountyId === countyId) return

    startTransition(() => {
      setSelectedCountyId(countyId)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      clearCountyDetailError()
    })
    
    setActiveTab('county', 0)
  }

  const handleTownshipSelect = (townshipId: string, options?: { skipTabSwitch?: boolean, zoom?: number }) => {
    startTransition(() => {
      setSelectedTownshipId(townshipId)
      setSelectedSchoolId(null)
      setMapZoom((curr) => Math.max(curr ?? 0, options?.zoom ?? MAP_TOWNSHIP_FOCUS_ZOOM))
    })

    if (!options?.skipTabSwitch) {
      setActiveTab('schools', 0)
    }
  }

  const handleSchoolSelect = (schoolId: string | null, options?: { skipTabSwitch?: boolean }) => {
    const shouldResetSchool = selectedSchoolId === schoolId
    const nextId = shouldResetSchool ? null : schoolId

    startTransition(() => {
      setSelectedSchoolId(nextId)
      
      if (nextId && summaryDataset?.schoolCodeIndex) {
        const entry = Object.values(summaryDataset.schoolCodeIndex).find(e => 
          (e as any).schoolIds?.includes(nextId)
        )
        if (entry) {
          const cid = (entry as any).countyId ?? (entry as any).countyCode ?? null
          const tid = (entry as any).townshipId ?? (entry as any).townCode ?? null
          if (cid) setSelectedCountyId(cid)
          if (tid) setSelectedTownshipId(tid)
          if ((entry as any).latitude && (entry as any).longitude) {
            setMapLat((entry as any).latitude)
            setMapLon((entry as any).longitude)
            setMapZoom((curr) => Math.max(curr ?? 0, MAP_TOWNSHIP_FOCUS_ZOOM))
          }
        }
      }

      if (nextId && !options?.skipTabSwitch) {
        setActiveTab('school-focus', 0)
      }
    })
  }

  const handleResetScope = () => {
    startTransition(() => {
      setRegion('全部')
      setSelectedCountyId(null)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      clearCountyDetailError()
      setMapResetToken((current) => current + 1)
      setActiveTab('overview', 0)
    })
  }

  const handleNavigateScope = (depth: number) => {
    if (depth === 0) {
      handleResetScope()
      return
    }

    startTransition(() => {
      if (depth === 1) {
        setSelectedTownshipId(null)
        setSelectedSchoolId(null)
        setMapZoom(MAP_TOWNSHIP_ZOOM)
        clearCountyDetailError()
        setActiveTab('county', 0)
      } else if (depth === 2) {
        setSelectedSchoolId(null)
        setMapZoom(MAP_TOWNSHIP_FOCUS_ZOOM)
        setActiveTab('schools', 0)
      }
    })
  }

  return {
    handleRegionSelect,
    handleCountySelect,
    ensureCountySelected,
    handleTownshipSelect,
    handleSchoolSelect,
    handleResetScope,
    handleNavigateScope,
  }
}
