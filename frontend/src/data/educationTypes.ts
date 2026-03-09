import type { FeatureCollection, Geometry } from 'geojson'

export const ACADEMIC_YEARS = [107, 108, 109, 110, 111, 112, 113, 114] as const
export const EDUCATION_LEVELS = ['全部', '國小', '國中', '高中職', '大專院校'] as const
export const MANAGEMENT_TYPES = ['全部', '公立', '私立'] as const
export const REGION_GROUPS = ['全部', '北部', '中部', '南部', '東部', '離島'] as const

export type AcademicYear = (typeof ACADEMIC_YEARS)[number]
export type EducationLevelFilter = (typeof EDUCATION_LEVELS)[number]
export type SchoolLevel = Exclude<EducationLevelFilter, '全部'>
export type ManagementTypeFilter = (typeof MANAGEMENT_TYPES)[number]
export type SchoolManagementType = Exclude<ManagementTypeFilter, '全部'>
export type RegionGroupFilter = (typeof REGION_GROUPS)[number]
export type RegionGroup = Exclude<RegionGroupFilter, '全部'>

export type TrendRecord = {
  year: AcademicYear
  students: number
  isEstimated?: boolean
  isMissing?: boolean
}

export type SummaryTrendRecord = {
  year: AcademicYear
  students: number
  schools: number
}

export type DataNote = {
  type: '停辦' | '缺年度' | '行政區改制' | '名稱異動' | '異常值' | '其他'
  message: string
  severity: 'info' | 'warning' | 'critical'
  years?: number[]
}

export type SchoolRecord = {
  id: string
  code: string
  name: string
  countyId: string
  townshipId: string
  educationLevel: SchoolLevel
  managementType: SchoolManagementType
  address: string
  phone: string
  website: string
  profileUrl?: string
  coordinates: {
    longitude: number
    latitude: number
  }
  yearlyStudents: TrendRecord[]
  status?: '正常' | '停辦' | '整併' | '待確認'
  missingYears?: AcademicYear[]
  dataNotes?: DataNote[]
}

export type TownshipRecord = {
  id: string
  name: string
  countyId: string
  schools: SchoolRecord[]
  dataNotes?: DataNote[]
}

export type CountyRecord = {
  id: string
  name: string
  shortLabel: string
  region: RegionGroup
  towns: TownshipRecord[]
  dataNotes?: DataNote[]
}

export type SummaryBucketKey = `${EducationLevelFilter}|${ManagementTypeFilter}`

export type TownshipSummaryRecord = {
  id: string
  name: string
  countyId: string
  dataNotes?: DataNote[]
  summaries: Record<SummaryBucketKey, SummaryTrendRecord[]>
}

export type SchoolBucketPreview = {
  id: string
  name: string
  townshipName: string
  students: number
  status: NonNullable<SchoolRecord['status']>
}

export type SchoolBucketRecord = {
  id: string
  geohash: string
  precision: number
  count: number
  totalStudents: number
  latitude: number
  longitude: number
  bounds: {
    minLatitude: number
    maxLatitude: number
    minLongitude: number
    maxLongitude: number
  }
  topSchools: SchoolBucketPreview[]
}

export type CountyBucketDataset = {
  generatedAt: string
  county: {
    id: string
    name: string
    shortLabel: string
    region: RegionGroup
  }
  precisions: Record<string, SchoolBucketRecord[]>
}

export type CountySummaryRecord = {
  id: string
  name: string
  shortLabel: string
  region: RegionGroup
  townshipFile: string
  detailFile: string
  bucketFile: string
  assetMetrics?: {
    sqliteBytes?: number
    detailBytes: number
    townshipBytes: number
    bucketBytes: number
  }
  dataNotes?: DataNote[]
  summaries: Record<SummaryBucketKey, SummaryTrendRecord[]>
  towns: TownshipSummaryRecord[]
}

export type SchoolCodeEntry = {
  countyId: string
  townshipId: string
  name: string
  longitude?: number
  latitude?: number
}

export type MissingCoordinateEntry = {
  code: string
  name: string
  county: string
  township: string
  level: SchoolLevel
  address?: string
  longitude?: number
  latitude?: number
  coordinateResolution?: '人工校正' | '地址解點' | '鄉鎮近似值'
  coordinateMatchType?: string
  coordinateMatchScore?: number
}

export const COORDINATE_WORKFLOW_STATUSES = ['GIS缺點位', '人工補點', '已回填'] as const
export type CoordinateWorkflowStatus = (typeof COORDINATE_WORKFLOW_STATUSES)[number]

export type CoordinateWorkflowEntry = {
  schoolCode: string
  status: CoordinateWorkflowStatus
  updatedAt: string
}

export type EducationSummaryDataset = {
  generatedAt: string
  years: readonly AcademicYear[]
  assetMetrics?: {
    sqliteBytes?: number
    summaryBytes?: number
    countyBoundaryBytes: number
    countyDetailBytes: number
    countyBucketBytes?: number
    townshipBoundaryBytes: number
  }
  sources: {
    points: string
    statistics: string
    townshipBoundaries: string
    countyBoundaries: string
  }
  schoolCodeIndex?: Record<string, SchoolCodeEntry>
  missingCoordinates?: MissingCoordinateEntry[]
  counties: CountySummaryRecord[]
}

export type CountyDetailDataset = {
  county: {
    id: string
    name: string
    shortLabel: string
    region: RegionGroup
  }
  dataNotes?: DataNote[]
  towns: TownshipRecord[]
}

export type CountyBoundaryProperties = {
  countyId: string
  countyCode: string
  countyName: string
  countyEng: string
  shortLabel: string
  region: RegionGroup
  townshipFile: string
  centerLongitude: number
  centerLatitude: number
}

export type TownshipBoundaryProperties = {
  countyId: string
  countyCode: string
  countyName: string
  townId: string
  townCode: string
  townName: string
  townEng: string
  region: RegionGroup
  centerLongitude: number
  centerLatitude: number
}

export type CountyBoundaryCollection = FeatureCollection<Geometry, CountyBoundaryProperties>
export type TownshipBoundaryCollection = FeatureCollection<Geometry, TownshipBoundaryProperties>

export type AtlasLoadSource = 'memory' | 'sqlite' | 'network'

export type AtlasLoadObservationSnapshot = {
  loadedCountyDetails: string[]
  loadedBucketSlices: string[]
  loadedTownshipSlices: string[]
  cacheHits: number
  memoryHits: number
  sqliteHits: number
  networkFetches: number
  totalTransferredBytes: number
  resourceSizes: Record<string, number>
  lastLoadSource: AtlasLoadSource | null
}

export function buildSummaryBucketKey(
  educationLevel: EducationLevelFilter,
  managementType: ManagementTypeFilter,
): SummaryBucketKey {
  return `${educationLevel}|${managementType}`
}