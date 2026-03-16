import { useState, useDeferredValue } from 'react'
import type { AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../data/educationData'

/**
 * Atom Hook: Manages the global filtering state of the Atlas.
 */
export function useFilterAppState(initial: {
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  searchText: string
}) {
  const [activeYear, setActiveYear] = useState<AcademicYear>(initial.activeYear)
  const [educationLevel, setEducationLevel] = useState<EducationLevelFilter>(initial.educationLevel)
  const [managementType, setManagementType] = useState<ManagementTypeFilter>(initial.managementType)
  const [region, setRegion] = useState<RegionGroupFilter>(initial.region)
  const [searchText, setSearchText] = useState(initial.searchText)
  const deferredSearchText = useDeferredValue(searchText)

  return {
    activeYear, setActiveYear,
    educationLevel, setEducationLevel,
    managementType, setManagementType,
    region, setRegion,
    searchText, setSearchText,
    deferredSearchText,
  }
}
