import { recordResourceLoad } from '../atlasLoadObservation'
import { loadDatabase, SQLITE_RESOURCE_KEY, type LoadDatabaseOptions } from './connection'
import { mapRows, parseJsonValue, buildSummaryMap, buildSchoolCodeIndex, type SqlValueRow } from './mappers'
import type { 
  EducationSummaryDataset, 
  CountySummaryRecord,
  DataNote,
  RegionGroup,
  SchoolLevel,
  MissingCoordinateEntry,
} from '../educationTypes'

let summaryCache: EducationSummaryDataset | null = null

const countyDetailFileLookup = new Map<string, string>()
const bucketFileLookup = new Map<string, string>()
const countyCodeLookup = new Map<string, string>()

export function resolveCountyCode(input: string) {
  return countyCodeLookup.get(input) ?? input
}

export function registerCountyLookups(counties: CountySummaryRecord[]) {
  countyDetailFileLookup.clear()
  bucketFileLookup.clear()
  countyCodeLookup.clear()
  counties.forEach((county) => {
    const countyCode = county.countyCode ?? county.id
    countyDetailFileLookup.set(county.detailFile, county.id)
    bucketFileLookup.set(county.bucketFile, county.id)
    countyCodeLookup.set(county.id, countyCode)
    countyCodeLookup.set(countyCode, countyCode)
    countyCodeLookup.set(county.detailFile, countyCode)
    countyCodeLookup.set(county.bucketFile, countyCode)
  })
}

const EMPTY_DATA_NOTES: DataNote[] = []

function readMeta(db: { exec: (sql: string, params?: unknown[]) => Array<{ columns: string[]; values: unknown[][] }> }, key: string) {
  const rows = mapRows(db.exec('SELECT value FROM meta WHERE key = ?', [key]))
  return rows[0]?.value
}

export async function loadEducationSummaryWithOptions(options: LoadDatabaseOptions = {}) {
  if (options.forceRefresh) {
    summaryCache = null
  }

  if (summaryCache) {
    recordResourceLoad({
      source: 'memory',
      resourceKey: SQLITE_RESOURCE_KEY,
      bytes: summaryCache.assetMetrics?.sqliteBytes,
    })
    return summaryCache
  }

  const { db, bytes } = await loadDatabase(options)
  const years = parseJsonValue(readMeta(db, 'years'), []) as EducationSummaryDataset['years']
  const sources = parseJsonValue(readMeta(db, 'sources'), {
    points: '',
    statistics: '',
    townshipBoundaries: '',
    countyBoundaries: '',
  })
  const dataNotes = parseJsonValue(readMeta(db, 'dataNotes'), []) as EducationSummaryDataset['dataNotes']
  const generatedAt = String(readMeta(db, 'generatedAt') ?? '')
  
  const countyRows = mapRows(db.exec('SELECT * FROM counties ORDER BY name'))
  const townRows = mapRows(db.exec('SELECT * FROM towns ORDER BY county_id, name'))
  const countySummaryRows = mapRows(db.exec('SELECT * FROM county_summaries ORDER BY county_id, year, education_level, management_type'))
  const townSummaryRows = mapRows(db.exec('SELECT * FROM town_summaries ORDER BY county_id, town_id, year, education_level, management_type'))
  const coordinateIssueRows = mapRows(db.exec('SELECT * FROM coordinate_issues ORDER BY county_legacy_id, township_legacy_id, code, school_level'))
  const schoolIndexRows = mapRows(db.exec(`
    SELECT schools.code, schools.legacy_id, schools.name, schools.education_level, schools.longitude, schools.latitude,
           schools.county_id, schools.county_legacy_id, schools.township_id, schools.township_legacy_id,
           counties.name AS county_name, towns.name AS township_name
    FROM schools
    JOIN counties ON counties.id = schools.county_id
    JOIN towns ON towns.id = schools.township_id
    ORDER BY schools.code, schools.education_level
  `))

  const countySummaryLookup = new Map<string, SqlValueRow[]>()
  countySummaryRows.forEach((row) => {
    const key = String(row.county_id)
    if (!countySummaryLookup.has(key)) countySummaryLookup.set(key, [])
    countySummaryLookup.get(key)?.push(row)
  })

  const townSummaryLookup = new Map<string, SqlValueRow[]>()
  townSummaryRows.forEach((row) => {
    const key = String(row.town_id)
    if (!townSummaryLookup.has(key)) townSummaryLookup.set(key, [])
    townSummaryLookup.get(key)?.push(row)
  })

  const townRowsByCounty = new Map<string, SqlValueRow[]>()
  townRows.forEach((row) => {
    const key = String(row.county_id)
    if (!townRowsByCounty.has(key)) townRowsByCounty.set(key, [])
    townRowsByCounty.get(key)?.push(row)
  })

  const counties = countyRows.map((countyRow) => {
    const countyCode = String(countyRow.id)
    const towns = (townRowsByCounty.get(countyCode) ?? []).map((townRow) => ({
      id: String(townRow.legacy_id),
      countyId: String(countyRow.legacy_id),
      countyCode,
      townCode: String(townRow.id),
      legacyTownshipId: String(townRow.legacy_id),
      name: String(townRow.name),
      dataNotes: parseJsonValue(townRow.data_notes_json, []),
      summaries: buildSummaryMap(townSummaryLookup.get(String(townRow.id)) ?? []),
    }))

    return {
      id: String(countyRow.legacy_id),
      countyCode,
      legacyCountyId: String(countyRow.legacy_id),
      name: String(countyRow.name),
      shortLabel: String(countyRow.short_label),
      region: String(countyRow.region) as RegionGroup,
      townshipFile: String(countyRow.township_file),
      detailFile: String(countyRow.detail_file),
      bucketFile: String(countyRow.bucket_file),
      schoolAtlasFile: String(countyRow.school_atlas_file),
      assetMetrics: {
        detailBytes: Number(countyRow.detail_bytes),
        bucketBytes: Number(countyRow.bucket_bytes),
        townshipBytes: Number(countyRow.township_bytes),
        schoolAtlasBytes: Number(countyRow.school_atlas_bytes),
        sqliteBytes: bytes,
      },
      dataNotes: parseJsonValue(countyRow.data_notes_json, EMPTY_DATA_NOTES),
      summaries: buildSummaryMap(countySummaryLookup.get(countyCode) ?? []),
      towns,
    }
  })

  const summary: EducationSummaryDataset = {
    generatedAt,
    years,
    schoolAtlasFile: 'school-atlas/index.json',
    dataNotes,
    assetMetrics: {
      countyBoundaryBytes: 0,
      countyDetailBytes: counties.reduce((sum, county) => sum + (county.assetMetrics?.detailBytes ?? 0), 0),
      townshipBoundaryBytes: counties.reduce((sum, county) => sum + (county.assetMetrics?.townshipBytes ?? 0), 0),
      countyBucketBytes: counties.reduce((sum, county) => sum + (county.assetMetrics?.bucketBytes ?? 0), 0),
      schoolAtlasBytes: counties.reduce((sum, county) => sum + (county.assetMetrics?.schoolAtlasBytes ?? 0), 0),
      sqliteBytes: bytes,
    },
    sources,
    schoolCodeIndex: buildSchoolCodeIndex(schoolIndexRows),
    missingCoordinates: coordinateIssueRows.map((row) => ({
      code: String(row.code),
      name: String(row.school_name),
      county: String(row.county_legacy_id),
      township: String(row.township_legacy_id).split(':').slice(1).join(':') || String(row.township_legacy_id),
      countyCode: String(row.county_id),
      townCode: String(row.township_id),
      level: String(row.school_level) as SchoolLevel,
      address: String(row.address || ''),
      longitude: row.longitude == null ? undefined : Number(row.longitude),
      latitude: row.latitude == null ? undefined : Number(row.latitude),
      coordinateResolution: row.coordinate_resolution == null ? undefined : (String(row.coordinate_resolution) as MissingCoordinateEntry['coordinateResolution']),
      coordinateMatchType: row.coordinate_match_type == null ? undefined : String(row.coordinate_match_type),
      coordinateMatchScore: row.coordinate_match_score == null ? undefined : Number(row.coordinate_match_score),
    })),
    counties,
  }

  summaryCache = summary
  registerCountyLookups(summary.counties)
  recordResourceLoad({
    source: 'sqlite',
    resourceKey: SQLITE_RESOURCE_KEY,
    bytes,
  })
  return summary
}

export function resetSummaryCache() {
  summaryCache = null
  countyDetailFileLookup.clear()
  bucketFileLookup.clear()
  countyCodeLookup.clear()
}
