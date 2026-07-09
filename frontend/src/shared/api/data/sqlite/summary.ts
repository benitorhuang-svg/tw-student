import { recordResourceLoad } from '../atlasLoadObservation'
import { SQLITE_RESOURCE_KEY, type LoadDatabaseOptions } from './connection'
import type { 
  EducationSummaryDataset, 
  CountySummaryRecord,
} from '../educationTypes'

let summaryCache: EducationSummaryDataset | null = null
let schoolCodeIndexCache: NonNullable<EducationSummaryDataset['schoolCodeIndex']> | null = null

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

  const sqliteWorker = await import('./sqliteWorkerClient')
  const bytes = await sqliteWorker.initSqliteWorker(options.forceRefresh)
  const [
    yearsResult,
    sourcesResult,
    dataNotesResult,
    generatedAtResult,
    countyResult,
    townResult,
    countySummaryResult,
    townSummaryResult,
    coordinateIssueResult,
  ] = await Promise.all([
    sqliteWorker.execInSqlite('SELECT value FROM meta WHERE key = ?', ['years']),
    sqliteWorker.execInSqlite('SELECT value FROM meta WHERE key = ?', ['sources']),
    sqliteWorker.execInSqlite('SELECT value FROM meta WHERE key = ?', ['dataNotes']),
    sqliteWorker.execInSqlite('SELECT value FROM meta WHERE key = ?', ['generatedAt']),
    sqliteWorker.execInSqlite('SELECT * FROM counties ORDER BY name'),
    sqliteWorker.execInSqlite('SELECT * FROM towns ORDER BY county_id, name'),
    sqliteWorker.execInSqlite('SELECT * FROM county_summaries ORDER BY county_id, year, education_level, management_type'),
    sqliteWorker.execInSqlite('SELECT * FROM town_summaries ORDER BY county_id, town_id, year, education_level, management_type'),
    sqliteWorker.execInSqlite('SELECT * FROM coordinate_issues ORDER BY county_legacy_id, township_legacy_id, code, school_level'),
  ])

  const { processSummaryInWorker } = await import('./summaryWorkerClient')
  const summary = await processSummaryInWorker({
    yearsResult,
    sourcesResult,
    dataNotesResult,
    generatedAtResult,
    countyResult,
    townResult,
    countySummaryResult,
    townSummaryResult,
    coordinateIssueResult,
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

export async function loadSchoolCodeIndexWithOptions(options: LoadDatabaseOptions = {}) {
  if (options.forceRefresh) {
    schoolCodeIndexCache = null
  }

  if (schoolCodeIndexCache) {
    return schoolCodeIndexCache
  }

  const sqliteWorker = await import('./sqliteWorkerClient')
  await sqliteWorker.initSqliteWorker(options.forceRefresh)
  const schoolIndexResult = await sqliteWorker.execInSqlite(`
    SELECT schools.code, schools.legacy_id, schools.name, schools.education_level, schools.longitude, schools.latitude,
           schools.county_id, schools.county_legacy_id, schools.township_id, schools.township_legacy_id,
           counties.name AS county_name, towns.name AS township_name
    FROM schools
    JOIN counties ON counties.id = schools.county_id
    JOIN towns ON towns.id = schools.township_id
    ORDER BY schools.code, schools.education_level
  `)

  const { processSchoolCodeIndexInWorker } = await import('./summaryWorkerClient')
  schoolCodeIndexCache = await processSchoolCodeIndexInWorker({ schoolIndexResult })
  return schoolCodeIndexCache
}

export function resetSummaryCache() {
  summaryCache = null
  schoolCodeIndexCache = null
  countyDetailFileLookup.clear()
  bucketFileLookup.clear()
  countyCodeLookup.clear()
}
