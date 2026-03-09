import { useRef, useState } from 'react'
import {
  ACADEMIC_YEARS,
  EDUCATION_LEVELS,
  MANAGEMENT_TYPES,
  type AcademicYear,
  type EducationLevelFilter,
  type ManagementTypeFilter,
  type RegionGroupFilter,
} from '../data/educationData'

export type AtlasTab = 'overview' | 'regional' | 'county' | 'schools' | 'school-focus'

export const DEFAULT_YEAR = ACADEMIC_YEARS.at(-1) ?? 114

function isAtlasTab(value: string | null): value is AtlasTab {
  return value === 'overview' || value === 'regional' || value === 'county' || value === 'schools' || value === 'school-focus'
}

export function readInitialQueryState() {
  const params = new URLSearchParams(window.location.search)
  const year = Number(params.get('year'))
  const educationLevel = params.get('level')
  const managementType = params.get('management')
  const compare = params.get('compare')
  const tab = params.get('tab')
  const zoomRaw = Number(params.get('zoom'))
  const latRaw = Number(params.get('lat'))
  const lonRaw = Number(params.get('lon'))

  return {
    activeYear: ACADEMIC_YEARS.includes(year as AcademicYear) ? (year as AcademicYear) : DEFAULT_YEAR,
    educationLevel: EDUCATION_LEVELS.includes(educationLevel as EducationLevelFilter)
      ? (educationLevel as EducationLevelFilter)
      : '全部',
    managementType: MANAGEMENT_TYPES.includes(managementType as ManagementTypeFilter)
      ? (managementType as ManagementTypeFilter)
      : '全部',
    region: '全部' as RegionGroupFilter,
    searchText: params.get('search') ?? '',
    selectedCountyId: params.get('county'),
    selectedTownshipId: params.get('township'),
    comparisonCountyIds: compare ? compare.split(',').map((value) => value.trim()).filter(Boolean) : [],
    comparisonScenarioName: params.get('scenario') ?? '',
    tab: isAtlasTab(tab) ? tab : 'overview',
    zoom: Number.isFinite(zoomRaw) && zoomRaw >= 7 && zoomRaw <= 12 ? zoomRaw : undefined,
    lat: Number.isFinite(latRaw) && latRaw >= 21 && latRaw <= 26 ? latRaw : undefined,
    lon: Number.isFinite(lonRaw) && lonRaw >= 119 && lonRaw <= 123 ? lonRaw : undefined,
  }
}

export function useAtlasTabState(initialTab: AtlasTab) {
  const [activeTab, setActiveTabRaw] = useState<AtlasTab>(initialTab)
  const sidebarRef = useRef<HTMLElement>(null)
  const tabScrollMemory = useRef<Record<string, number>>({})

  const setActiveTab = (nextTab: AtlasTab, scrollTop?: number) => {
    if (sidebarRef.current) {
      tabScrollMemory.current[activeTab] = sidebarRef.current.scrollTop
    }

    setActiveTabRaw(nextTab)

    requestAnimationFrame(() => {
      if (sidebarRef.current) {
        sidebarRef.current.scrollTop = scrollTop ?? tabScrollMemory.current[nextTab] ?? 0
      }
    })
  }

  return { activeTab, setActiveTab, sidebarRef }
}