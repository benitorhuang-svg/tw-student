import { useRef, useState } from 'react'
import {
  ACADEMIC_YEARS,
  EDUCATION_LEVELS,
  MANAGEMENT_TYPES,
  REGION_GROUPS,
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

  const region = params.get('region')
  const school = params.get('school')
  const forceTownshipLabels = params.get('forceTownshipLabels')

  return {
    activeYear: ACADEMIC_YEARS.includes(year as AcademicYear) ? (year as AcademicYear) : DEFAULT_YEAR,
    educationLevel: EDUCATION_LEVELS.includes(educationLevel as EducationLevelFilter)
      ? (educationLevel as EducationLevelFilter)
      : '全部',
    managementType: MANAGEMENT_TYPES.includes(managementType as ManagementTypeFilter)
      ? (managementType as ManagementTypeFilter)
      : '全部',
    region: (REGION_GROUPS.includes(region as RegionGroupFilter) ? (region as RegionGroupFilter) : '全部'),
    searchText: params.get('search') ?? '',
    selectedCountyId: params.get('county'),
    selectedTownshipId: params.get('township'),
    selectedSchoolId: school ? school : null,
    comparisonCountyIds: compare ? compare.split(',').map((value) => value.trim()).filter(Boolean) : [],
    comparisonScenarioName: params.get('scenario') ?? '',
    tab: isAtlasTab(tab) ? tab : 'overview',
    tabIsExplicit: params.has('tab'),
    forceTownshipLabels: forceTownshipLabels === 'true',
    zoom: Number.isFinite(zoomRaw) && zoomRaw >= 7 && zoomRaw <= 18 ? zoomRaw : undefined,
    lat: Number.isFinite(latRaw) && latRaw >= 21 && latRaw <= 26 ? latRaw : undefined,
    lon: Number.isFinite(lonRaw) && lonRaw >= 119 && lonRaw <= 123 ? lonRaw : undefined,
  }
}

export function useAtlasTabState(initialTab: AtlasTab) {
  const [activeTab, setActiveTabRaw] = useState<AtlasTab>(initialTab)
  const sidebarRef = useRef<HTMLDivElement>(null)
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