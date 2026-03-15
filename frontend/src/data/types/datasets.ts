import type { FeatureCollection, Geometry } from 'geojson'
import type { AcademicYear, RegionGroup, SchoolLevel, SchoolManagementType, SummaryBucketKey, AtlasLoadSource } from './base'
import type { DataNote } from './metadata'
import type { 
  SchoolBucketRecord, 
  StudentCompositionRecord, 
  SummaryTrendRecord, 
  TrendRecord,
  TownshipRecord
} from './entities'

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
