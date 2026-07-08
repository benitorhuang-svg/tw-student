import {
  ACADEMIC_YEARS,
  type AcademicYear,
  type CountyBucketDataset,
  type CountyBoundaryCollection,
  type CountyDetailDataset,
  type DataNote,
  type EducationLevelFilter,
  type ManagementTypeFilter,
  type RegionGroupFilter,
  type SummaryTrendRecord,
  type TownshipBoundaryCollection,
  type EducationSummaryDataset,
  type AtlasLoadObservationSnapshot,
} from '../../api/data/educationData'

export type InvestigationSeriesRow = {
  year: number
  students: number
  schools?: number
  flags?: string[]
}

export type InvestigationItem = {
  id: string
  scope: string
  category: InvestigationFilter
  title: string
  detail: string
  meta: string
  severity: DataNote['severity']
  actionable: boolean
  seriesRows: InvestigationSeriesRow[]
  downloadName: string
}

export type SavedComparisonScenario = {
  id: string
  name: string
  countyIds: string[]
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  pinned?: boolean
  updatedAt: string
}

export type InvestigationFilter = '全部' | '缺年度' | '待確認' | '停辦/整併' | '正式註記'

export type SchoolWorkbenchView = 'list' | 'analysis' | 'notes'

export type AtlasTab = 'welcome' | 'overview' | 'county' | 'schools' | 'school-focus'

export const DEFAULT_YEAR = ACADEMIC_YEARS[ACADEMIC_YEARS.length - 1]

export type AtlasFilters = {
  year: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  searchText: string
}

export type {
  AcademicYear,
  CountyBucketDataset,
  CountyBoundaryCollection,
  CountyDetailDataset,
  DataNote,
  EducationLevelFilter,
  EducationSummaryDataset,
  ManagementTypeFilter,
  RegionGroupFilter,
  SummaryTrendRecord,
  TownshipBoundaryCollection,
  AtlasLoadObservationSnapshot,
}
