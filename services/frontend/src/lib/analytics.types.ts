import type {
  AcademicYear,
  CountyDetailDataset,
  CountyRecord,
  CountySummaryRecord,
  DataNote,
  EducationLevelFilter,
  ManagementTypeFilter,
  RegionGroupFilter,
  SchoolRecord,
  StudentCompositionRecord,
} from '../data/educationData'

export type DashboardFilters = {
  year: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  searchText: string
}

export type TrendPoint = {
  year: AcademicYear
  value: number
}

export type CountySummary = {
  id: string
  name: string
  shortLabel: string
  region: Exclude<RegionGroupFilter, '全部'>
  students: number
  schools: number
  delta: number
  deltaRatio: number
  trend: TrendPoint[]
  filteredOut: boolean
}

export type RankingSummary = {
  id: string
  label: string
  subLabel: string
  students: number
  schools: number
  delta: number
  deltaRatio: number
  trend: TrendPoint[]
}

export type ScopeSummary = {
  label: string
  caption: string
  students: number
  schools: number
  delta: number
  deltaRatio: number
  trend: TrendPoint[]
}

export type EducationDistributionRow = {
  level: Exclude<EducationLevelFilter, '全部'>
  students: number
  schools: number
  share: number
}

export type CountyComparisonSummary = {
  id: string
  name: string
  shortLabel: string
  region: Exclude<RegionGroupFilter, '全部'>
  students: number
  schools: number
  delta: number
  deltaRatio: number
  trend: TrendPoint[]
  distribution: EducationDistributionRow[]
}

export type SchoolInsight = {
  id: string
  code: string
  name: string
  countyName: string
  townshipId: string
  townshipName: string
  educationLevel: SchoolRecord['educationLevel']
  managementType: SchoolRecord['managementType']
  address: string
  phone: string
  website: string
  currentStudents: number
  delta: number
  deltaRatio: number
  trend: TrendPoint[]
  studentCompositions?: StudentCompositionRecord[]
  status?: SchoolRecord['status']
  missingYears?: SchoolRecord['missingYears']
  dataNotes?: DataNote[]
  studentTeacherRatio?: number
  averageClassSize?: number
}

export type RegionalComparisonRow = {
  id: string
  label: string
  countyCount: number
  students: number
  schools: number
  delta: number
  deltaRatio: number
  publicStudents: number
  privateStudents: number
  publicShare: number
  privateShare: number
  trend: TrendPoint[]
}

export type AnalyticsSchoolContext = {
  countyDetail: CountyDetailDataset | null
  county: CountyRecord
  countySummary: CountySummaryRecord
}