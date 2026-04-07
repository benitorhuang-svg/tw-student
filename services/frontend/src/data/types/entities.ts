import type { AcademicYear, RegionGroup, SchoolLevel, SchoolManagementType } from './base'
import type { DataNote } from './metadata'

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

export type SummaryTrendRecord = {
  year: AcademicYear
  students: number
  schools: number
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
