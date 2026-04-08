import type { FeatureCollection, Geometry } from 'geojson'
import type { AcademicYear, RegionGroup, SchoolLevel, SummaryBucketKey, AtlasLoadSource } from './base'
import type { DataNote } from './metadata'
import type { 
  SchoolBucketRecord, 
  SummaryTrendRecord, 
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

export type EducationSummaryDataset = {
  generatedAt: string
  years: readonly AcademicYear[]
  dataNotes?: DataNote[]
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
