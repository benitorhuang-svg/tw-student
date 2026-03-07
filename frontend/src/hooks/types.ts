import type {
  AcademicYear,
  CountyBucketDataset,
  CountyBoundaryCollection,
  CountyDetailDataset,
  DataNote,
  EducationLevelFilter,
  ManagementTypeFilter,
  RegionGroupFilter,
  SummaryTrendRecord,
  TownshipBoundaryCollection,
  EducationSummaryDataset,
  AtlasLoadObservationSnapshot,
} from '../data/educationData'

export type InvestigationSeriesRow = {
  year: number
  students: number
  schools?: number
  flags?: string[]
}

export type InvestigationItem = {
  id: string
  scope: string
  title: string
  detail: string
  meta: string
  severity: DataNote['severity']
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
  region: RegionGroupFilter
  pinned?: boolean
  updatedAt: string
}

export type InvestigationFilter = '全部' | '缺年度' | '待確認' | '停辦/整併' | '正式註記'

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
