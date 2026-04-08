import { recordResourceLoad } from '../atlasLoadObservation'
import { SQLITE_RESOURCE_KEY, type LoadDatabaseOptions } from './connection'
import { mapRows, type SqlValueRow } from './mappers'
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

  // Initialize sqlite worker and fetch raw SQL rows, then offload heavy mapping to a worker
  const bytes = await import('./sqliteWorkerClient').then((m) => m.initSqliteWorker(options.forceRefresh))
  const yearsRaw = mapRows(await import('./sqliteWorkerClient').then((m) => m.execInSqlite('SELECT value FROM meta WHERE key = ?', ['years'])))
  const sourcesRaw = mapRows(await import('./sqliteWorkerClient').then((m) => m.execInSqlite('SELECT value FROM meta WHERE key = ?', ['sources'])))
  const dataNotesRaw = mapRows(await import('./sqliteWorkerClient').then((m) => m.execInSqlite('SELECT value FROM meta WHERE key = ?', ['dataNotes'])))
  const generatedAtRaw = mapRows(await import('./sqliteWorkerClient').then((m) => m.execInSqlite('SELECT value FROM meta WHERE key = ?', ['generatedAt'])))

  const countyRows = mapRows(await import('./sqliteWorkerClient').then((m) => m.execInSqlite('SELECT * FROM counties ORDER BY name')))
  const townRows = mapRows(await import('./sqliteWorkerClient').then((m) => m.execInSqlite('SELECT * FROM towns ORDER BY county_id, name')))
  const countySummaryRows = mapRows(await import('./sqliteWorkerClient').then((m) => m.execInSqlite('SELECT * FROM county_summaries ORDER BY county_id, year, education_level, management_type')))
  const townSummaryRows = mapRows(await import('./sqliteWorkerClient').then((m) => m.execInSqlite('SELECT * FROM town_summaries ORDER BY county_id, town_id, year, education_level, management_type')))
  const coordinateIssueRows = mapRows(await import('./sqliteWorkerClient').then((m) => m.execInSqlite('SELECT * FROM coordinate_issues ORDER BY county_legacy_id, township_legacy_id, code, school_level')))
  const schoolIndexRows = mapRows(await import('./sqliteWorkerClient').then((m) => m.execInSqlite(`
    SELECT schools.code, schools.legacy_id, schools.name, schools.education_level, schools.longitude, schools.latitude,
           schools.county_id, schools.county_legacy_id, schools.township_id, schools.township_legacy_id,
           counties.name AS county_name, towns.name AS township_name
    FROM schools
    JOIN counties ON counties.id = schools.county_id
    JOIN towns ON towns.id = schools.township_id
    ORDER BY schools.code, schools.education_level
  `)))

  // Offload heavy mapping/parsing to worker
  const { processSummaryInWorker } = await import('./summaryWorkerClient')
  const summary = await processSummaryInWorker({
    yearsJson: yearsRaw[0]?.value,
    sourcesJson: sourcesRaw[0]?.value,
    dataNotesJson: dataNotesRaw[0]?.value,
    generatedAtJson: generatedAtRaw[0]?.value,
    countyRows,
    townRows,
    countySummaryRows,
    townSummaryRows,
    coordinateIssueRows,
    schoolIndexRows,
  })

  // worker already returned final summary structure
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
