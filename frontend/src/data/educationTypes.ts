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
  valueStatus?: 'official' | 'estimated' | 'zero' | 'missing' | 'year-not-applicable'
  isEstimated?: boolean
  isMissing?: boolean
}

export type StudentBandRecord = {
  id: string
  label: string
  category: 'grade' | 'degree' | 'track' | 'other'
  totalStudents: number
  maleStudents?: number
  femaleStudents?: number
}

export type StudentCompositionRecord = {
  year: AcademicYear
  totalStudents: number
  maleStudents?: number
  femaleStudents?: number
  bands: StudentBandRecord[]
}

export type DataAssetGroup =
  | 'summary'
  | 'validation'
  | 'schema'
  | 'school-atlas-index'
  | 'county-boundary'
  | 'lookup'
  | 'sqlite'
  | 'county-detail'
  | 'county-bucket'
  | 'school-atlas'
  | 'township-boundary'

export type ValidationSeverity = 'blocking' | 'warning' | 'info'
export type ValidationStatus = 'pass' | 'warning' | 'fail'

export type ValidationReportItem = {
  ruleId: string
  severity: ValidationSeverity
  status: ValidationStatus
  scope: string
  affectedAssets: string[]
  affectedRecordCount: number
  samples?: Array<Record<string, string | number | boolean | null | undefined>>
  recommendedAction: string
}

export type ValidationSummary = {
  overallStatus: ValidationStatus
  blockingCount: number
  warningCount: number
  infoCount: number
}

export type ValidationReport = {
  generatedAt: string
  schemaVersion: string
  overallStatus: ValidationStatus
  items: ValidationReportItem[]
}

export type DataManifestAsset = {
  path: string
  assetGroup: DataAssetGroup
  hash: string
  bytes: number
  dependsOnSchemaVersion: string
  critical: boolean
  countyId?: string
  countyCode?: string
  legacyAliases?: string[]
}

export type DataManifest = {
  schemaVersion: string
  generatedAt: string
  buildId: string
  contentHash: string
  previousCompatibleSchemaVersions: string[]
  validationSummary: ValidationSummary
  assets: DataManifestAsset[]
}

export type GradeMapBand = {
  bandId: string
  label: string
  sortOrder: number
}

export type GradeMapDimension = {
  dimensionType: 'grade' | 'degree' | 'track' | 'other'
  bands: GradeMapBand[]
}

export type GradeMapLevel = {
  levelCode: string
  label: string
  legacyLabels: string[]
  dimensions: GradeMapDimension[]
}

export type GradeMapSchema = {
  schemaVersion: string
  generatedAt: string
  levels: GradeMapLevel[]
  genderDimensions: Array<{
    key: 'male' | 'female' | 'total'
    label: string
  }>
}

export type DataRefreshSummary = {
  checkedAt: string
  overallStatus: 'idle' | 'up-to-date' | 'updated' | 'partial-failure' | 'failed' | 'fallback'
  localGeneratedAt?: string
  remoteGeneratedAt?: string
  localContentHash?: string
  remoteContentHash?: string
  schemaVersion?: string
  updatedAssets: string[]
  skippedAssets: string[]
  failedAssets: string[]
  rolledBackAssets: string[]
  message: string
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
  schoolLevelId?: string
  code: string
  name: string
  countyId: string
  townshipId: string
  countyCode?: string
  townCode?: string
  legacyCountyId?: string
  legacyTownshipId?: string
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
  studentCompositions?: StudentCompositionRecord[]
  status?: '正常' | '停辦' | '整併' | '待確認'
  missingYears?: AcademicYear[]
  dataNotes?: DataNote[]
}

export type TownshipRecord = {
  id: string
  name: string
  countyId: string
  countyCode?: string
  townCode?: string
  legacyTownshipId?: string
  schools: SchoolRecord[]
  dataNotes?: DataNote[]
}

export type CountyRecord = {
  id: string
  name: string
  shortLabel: string
  region: RegionGroup
  countyCode?: string
  legacyCountyId?: string
  towns: TownshipRecord[]
  dataNotes?: DataNote[]
}

export type SummaryBucketKey = `${EducationLevelFilter}|${ManagementTypeFilter}`

export type TownshipSummaryRecord = {
  id: string
  name: string
  countyId: string
  countyCode?: string
  townCode?: string
  legacyTownshipId?: string
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
    countyCode?: string
    legacyCountyId?: string
    name: string
    shortLabel: string
    region: RegionGroup
  }
  precisions: Record<string, SchoolBucketRecord[]>
}

export type CountySummaryRecord = {
  id: string
  countyCode?: string
  legacyCountyId?: string
  name: string
  shortLabel: string
  region: RegionGroup
  townshipFile: string
  detailFile: string
  bucketFile: string
  schoolAtlasFile: string
  assetMetrics?: {
    sqliteBytes?: number
    detailBytes: number
    townshipBytes: number
    bucketBytes: number
    schoolAtlasBytes: number
  }
  dataNotes?: DataNote[]
  summaries: Record<SummaryBucketKey, SummaryTrendRecord[]>
  towns: TownshipSummaryRecord[]
}

export type SchoolCodeEntry = {
  countyId: string
  townshipId: string
  countyCode?: string
  townCode?: string
  name: string
  countyName?: string
  townshipName?: string
  levels?: SchoolLevel[]
  schoolIds?: string[]
  longitude?: number
  latitude?: number
}

export type SchoolCodeAtlasLevelEntry = {
  schoolId: string
  schoolLevelId?: string
  name: string
  educationLevel: SchoolLevel
  managementType: SchoolManagementType
  countyId: string
  countyCode?: string
  countyName: string
  townshipId: string
  townCode?: string
  townshipName: string
  coordinates: {
    longitude: number
    latitude: number
  }
  address: string
  phone: string
  website: string
  profileUrl?: string
  yearlyStudents: TrendRecord[]
  studentCompositions: StudentCompositionRecord[]
  status?: '正常' | '停辦' | '整併' | '待確認'
  missingYears?: AcademicYear[]
  dataNotes?: DataNote[]
}

export type SchoolCodeAtlasEntry = {
  code: string
  primaryName: string
  aliases: string[]
  levels: SchoolCodeAtlasLevelEntry[]
}

export type SchoolAtlasDataset = {
  generatedAt: string
  years: readonly AcademicYear[]
  schools: SchoolCodeAtlasEntry[]
}

export type CountySchoolAtlasDataset = {
  generatedAt: string
  years: readonly AcademicYear[]
  county: {
    id: string
    countyCode?: string
    legacyCountyId?: string
    name: string
    shortLabel: string
    region: RegionGroup
  }
  schools: SchoolCodeAtlasEntry[]
}

export type SchoolAtlasIndexDataset = {
  generatedAt: string
  years: readonly AcademicYear[]
  counties: Array<{
    countyId: string
    countyCode?: string
    countyName: string
    schoolAtlasFile: string
    schoolCount: number
    levelCount: number
  }>
}

export type MissingCoordinateEntry = {
  code: string
  name: string
  county: string
  township: string
  countyCode?: string
  townCode?: string
  level: SchoolLevel
  address?: string
  longitude?: number
  latitude?: number
  coordinateResolution?: '人工校正' | '地址解點' | '鄉鎮近似值' | '共用 GIS 點位'
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
  schoolAtlasFile?: string
  dataNotes?: DataNote[]
  assetMetrics?: {
    sqliteBytes?: number
    summaryBytes?: number
    countyBoundaryBytes: number
    countyDetailBytes: number
    countyBucketBytes?: number
    schoolAtlasBytes?: number
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
    countyCode?: string
    legacyCountyId?: string
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