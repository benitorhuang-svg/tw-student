import { recordResourceLoad } from './atlasLoadObservation'
import { assertBinaryDataResponse, buildDataAssetUrl } from './dataAsset'
import { EDUCATION_LEVELS, MANAGEMENT_TYPES } from './educationTypes'
import type {
  AcademicYear,
  CountyBucketDataset,
  CountyDetailDataset,
  CountySummaryRecord,
  EducationSummaryDataset,
  StudentCompositionRecord,
  SummaryBucketKey,
  SummaryTrendRecord,
  TrendRecord,
} from './educationTypes'

const SQLITE_RESOURCE_KEY = 'sqlite:education-atlas.sqlite'

let sqlDatabasePromise: Promise<DatabaseHandle> | null = null
let summaryCache: EducationSummaryDataset | null = null
const countyDetailMemoryCache = new Map<string, CountyDetailDataset>()
const countyBucketMemoryCache = new Map<string, CountyBucketDataset>()
const pendingCountyDetailRequests = new Map<string, Promise<CountyDetailDataset>>()
const pendingCountyBucketRequests = new Map<string, Promise<CountyBucketDataset>>()
const countyDetailFileLookup = new Map<string, string>()
const bucketFileLookup = new Map<string, string>()
const countyCodeLookup = new Map<string, string>()

type SqlValueRow = Record<string, unknown>
type DatabaseHandle = {
  db: {
    exec: (sql: string, params?: unknown[]) => Array<{ columns: string[]; values: unknown[][] }>
  }
  bytes: number
}

type LoadDatabaseOptions = {
  forceRefresh?: boolean
}

function getDatabaseUrl(forceRefresh = false) {
  return buildDataAssetUrl('education-atlas.sqlite', forceRefresh)
}

function detectCountyIdFromDetailFile(detailFile: string) {
  return countyDetailFileLookup.get(detailFile) ?? detailFile.replace(/^counties\//, '').replace(/\.json$/, '')
}

function detectCountyIdFromBucketFile(bucketFile: string) {
  return bucketFileLookup.get(bucketFile) ?? bucketFile.replace(/^buckets\//, '').replace(/\.json$/, '')
}

function resolveCountyCode(input: string) {
  return countyCodeLookup.get(input) ?? input
}

function mapRows(result: Array<{ columns: string[]; values: unknown[][] }>) {
  return result.flatMap((entry) => entry.values.map((values) => Object.fromEntries(entry.columns.map((column, index) => [column, values[index]]))))
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function readMeta(database: DatabaseHandle['db'], key: string) {
  const rows = mapRows(database.exec('SELECT value FROM meta WHERE key = ?', [key]))
  return rows[0]?.value
}

function toSummaryBucketKey(educationLevel: unknown, managementType: unknown) {
  return `${String(educationLevel)}|${String(managementType)}` as SummaryBucketKey
}

function buildSummaryMap(rows: SqlValueRow[]) {
  const summaries = Object.fromEntries(
    EDUCATION_LEVELS.flatMap((educationLevel) => MANAGEMENT_TYPES.map((managementType) => [
      toSummaryBucketKey(educationLevel, managementType),
      [] as SummaryTrendRecord[],
    ])),
  ) as Record<SummaryBucketKey, SummaryTrendRecord[]>

  rows.forEach((row) => {
    const bucketKey = toSummaryBucketKey(row.education_level, row.management_type)
    summaries[bucketKey].push({
      year: Number(row.year) as AcademicYear,
      students: Number(row.students),
      schools: Number(row.schools),
    })
  })

  Object.values(summaries).forEach((items) => items.sort((left, right) => left.year - right.year))
  return summaries
}

function buildSchoolCodeIndex(rows: SqlValueRow[]) {
  const levelOrder = new Map([['國小', 1], ['國中', 2], ['高中職', 3], ['大專院校', 4]])
  const schoolCodeIndex: NonNullable<EducationSummaryDataset['schoolCodeIndex']> = {}

  rows.forEach((row) => {
    const code = String(row.code)
    const current = schoolCodeIndex[code]
    const nextLevels = [...new Set([...(current?.levels ?? []), String(row.education_level)])]
      .sort((left, right) => (levelOrder.get(left) ?? 99) - (levelOrder.get(right) ?? 99))
    schoolCodeIndex[code] = {
      countyId: current?.countyId ?? String(row.county_legacy_id),
      townshipId: current?.townshipId ?? String(row.township_legacy_id),
      countyCode: current?.countyCode ?? String(row.county_id),
      townCode: current?.townCode ?? String(row.township_id),
      countyName: current?.countyName ?? String(row.county_name),
      townshipName: current?.townshipName ?? String(row.township_name),
      name: current?.name ?? String(row.name),
      schoolIds: [...new Set([...(current?.schoolIds ?? []), String(row.legacy_id)])],
      levels: nextLevels as NonNullable<EducationSummaryDataset['schoolCodeIndex']>[string]['levels'],
      longitude: current?.longitude ?? Number(row.longitude),
      latitude: current?.latitude ?? Number(row.latitude),
    }
  })

  return schoolCodeIndex
}

function registerCountyLookups(counties: CountySummaryRecord[]) {
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

function buildCompositionLookup(summaryRows: SqlValueRow[], bandRows: SqlValueRow[]) {
  const summaries = new Map<string, SqlValueRow>()
  const bands = new Map<string, SqlValueRow[]>()

  summaryRows.forEach((row) => {
    summaries.set(`${row.school_id}:${row.year}`, row)
  })
  bandRows.forEach((row) => {
    const key = `${row.school_id}:${row.year}`
    if (!bands.has(key)) {
      bands.set(key, [])
    }
    bands.get(key)?.push(row)
  })

  return { summaries, bands }
}

function buildStudentCompositions(
  schoolId: string,
  compositionLookup: ReturnType<typeof buildCompositionLookup>,
): StudentCompositionRecord[] {
  const compositionYears = new Set<number>([
    ...Array.from(compositionLookup.summaries.keys())
      .filter((key) => key.startsWith(`${schoolId}:`))
      .map((key) => Number(key.split(':').at(-1))),
    ...Array.from(compositionLookup.bands.keys())
      .filter((key) => key.startsWith(`${schoolId}:`))
      .map((key) => Number(key.split(':').at(-1))),
  ])

  return [...compositionYears]
    .sort((left, right) => left - right)
    .map((year) => {
      const summaryRow = compositionLookup.summaries.get(`${schoolId}:${year}`)
      const bandEntries = compositionLookup.bands.get(`${schoolId}:${year}`) ?? []

      return {
        year: year as AcademicYear,
        totalStudents: Number(summaryRow?.total_students ?? 0),
        maleStudents: summaryRow?.male_students == null ? undefined : Number(summaryRow.male_students),
        femaleStudents: summaryRow?.female_students == null ? undefined : Number(summaryRow.female_students),
        bands: bandEntries.map((band) => ({
          id: String(band.band_id),
          label: String(band.band_label),
          category: String(band.category) as StudentCompositionRecord['bands'][number]['category'],
          totalStudents: Number(band.total_students),
          maleStudents: band.male_students == null ? undefined : Number(band.male_students),
          femaleStudents: band.female_students == null ? undefined : Number(band.female_students),
        })),
      }
    })
}

function buildYearlyStudentLookup(rows: SqlValueRow[]) {
  const lookup = new Map<string, TrendRecord[]>()
  rows.forEach((row) => {
    const key = String(row.school_id)
    if (!lookup.has(key)) {
      lookup.set(key, [])
    }
    lookup.get(key)?.push({
      year: Number(row.year) as AcademicYear,
      students: Number(row.students),
      valueStatus: String(row.value_status) as TrendRecord['valueStatus'],
      isEstimated: Number(row.is_estimated) === 1 || undefined,
      isMissing: Number(row.is_missing) === 1 || undefined,
    })
  })
  lookup.forEach((items) => items.sort((left, right) => left.year - right.year))
  return lookup
}

async function loadDatabase(options: LoadDatabaseOptions = {}) {
  if (options.forceRefresh) {
    sqlDatabasePromise = null
  }

  if (!sqlDatabasePromise) {
    sqlDatabasePromise = (async () => {
      const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
        import('sql.js'),
        import('sql.js/dist/sql-wasm.wasm?url'),
      ])
      const SQL = await initSqlJs({ locateFile: () => wasmUrl })
      const url = getDatabaseUrl(options.forceRefresh)
      const response = await fetch(url, {
        cache: options.forceRefresh ? 'no-store' : 'default',
      })
      await assertBinaryDataResponse(response, 'education-atlas.sqlite', url)

      const buffer = new Uint8Array(await response.arrayBuffer())
      recordResourceLoad({
        source: 'network',
        resourceKey: SQLITE_RESOURCE_KEY,
        bytes: buffer.byteLength,
      })

      return {
        db: new SQL.Database(buffer),
        bytes: buffer.byteLength,
      }
    })()
  }

  return sqlDatabasePromise
}

export async function loadEducationSummary() {
  return loadEducationSummaryWithOptions()
}

async function loadEducationSummaryWithOptions(options: LoadDatabaseOptions = {}) {
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
    if (!countySummaryLookup.has(key)) {
      countySummaryLookup.set(key, [])
    }
    countySummaryLookup.get(key)?.push(row)
  })

  const townSummaryLookup = new Map<string, SqlValueRow[]>()
  townSummaryRows.forEach((row) => {
    const key = String(row.town_id)
    if (!townSummaryLookup.has(key)) {
      townSummaryLookup.set(key, [])
    }
    townSummaryLookup.get(key)?.push(row)
  })

  const townRowsByCounty = new Map<string, SqlValueRow[]>()
  townRows.forEach((row) => {
    const key = String(row.county_id)
    if (!townRowsByCounty.has(key)) {
      townRowsByCounty.set(key, [])
    }
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
      region: String(countyRow.region) as CountySummaryRecord['region'],
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
      dataNotes: parseJsonValue(countyRow.data_notes_json, []),
      summaries: buildSummaryMap(countySummaryLookup.get(countyCode) ?? []),
      towns,
    }
  })

  const summary: EducationSummaryDataset = {
    generatedAt,
    years,
    schoolAtlasFile: 'school-atlas/index.json',
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
      level: String(row.school_level) as NonNullable<EducationSummaryDataset['missingCoordinates']>[number]['level'],
      address: String(row.address || ''),
      longitude: row.longitude == null ? undefined : Number(row.longitude),
      latitude: row.latitude == null ? undefined : Number(row.latitude),
      coordinateResolution: row.coordinate_resolution == null ? undefined : String(row.coordinate_resolution) as NonNullable<EducationSummaryDataset['missingCoordinates']>[number]['coordinateResolution'],
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

export async function refreshEducationSummary() {
  return loadEducationSummaryWithOptions({ forceRefresh: true })
}

export async function loadCountyDetail(detailFile: string, countyId?: string) {
  const resolvedCountyId = countyId ?? detectCountyIdFromDetailFile(detailFile)
  if (countyDetailMemoryCache.has(resolvedCountyId)) {
    recordResourceLoad({
      source: 'memory',
      resourceKey: detailFile,
      countyDetailId: resolvedCountyId,
    })
    return countyDetailMemoryCache.get(resolvedCountyId) as CountyDetailDataset
  }

  const pendingRequest = pendingCountyDetailRequests.get(resolvedCountyId)
  if (pendingRequest) {
    return pendingRequest
  }

  const nextRequest = (async () => {
    const { db, bytes } = await loadDatabase()
    const countyCode = resolveCountyCode(resolvedCountyId)
    const countyRows = mapRows(db.exec('SELECT * FROM counties WHERE id = ?', [countyCode]))
    const countyRow = countyRows[0]
    if (!countyRow) {
      throw new Error(`找不到縣市資料：${resolvedCountyId}`)
    }

    const townRows = mapRows(db.exec('SELECT * FROM towns WHERE county_id = ? ORDER BY name', [countyCode]))
    const schoolRows = mapRows(db.exec('SELECT * FROM schools WHERE county_id = ? ORDER BY township_legacy_id, name', [countyCode]))
    const yearRows = mapRows(db.exec(`
      SELECT school_year_metrics.*
      FROM school_year_metrics
      JOIN schools ON schools.id = school_year_metrics.school_id
      WHERE schools.county_id = ?
      ORDER BY school_year_metrics.school_id, school_year_metrics.year
    `, [countyCode]))
    const compositionSummaryRows = mapRows(db.exec(`
      SELECT school_composition_summaries.*
      FROM school_composition_summaries
      JOIN schools ON schools.id = school_composition_summaries.school_id
      WHERE schools.county_id = ?
      ORDER BY school_composition_summaries.school_id, school_composition_summaries.year
    `, [countyCode]))
    const compositionRows = mapRows(db.exec(`
      SELECT school_compositions.*
      FROM school_compositions
      JOIN schools ON schools.id = school_compositions.school_id
      WHERE schools.county_id = ?
      ORDER BY school_compositions.school_id, school_compositions.year, school_compositions.band_id
    `, [countyCode]))

    const yearlyLookup = buildYearlyStudentLookup(yearRows)
    const compositionLookup = buildCompositionLookup(compositionSummaryRows, compositionRows)
    const schoolsByTown = new Map<string, CountyDetailDataset['towns'][number]['schools']>()

    schoolRows.forEach((row) => {
      const townshipKey = String(row.township_legacy_id)
      if (!schoolsByTown.has(townshipKey)) {
        schoolsByTown.set(townshipKey, [])
      }
      const schoolId = String(row.id)

      schoolsByTown.get(townshipKey)?.push({
        id: String(row.legacy_id),
        schoolLevelId: schoolId,
        code: String(row.code),
        name: String(row.name),
        countyId: String(row.county_legacy_id),
        townshipId: String(row.township_legacy_id),
        countyCode: String(row.county_id),
        townCode: String(row.township_id),
        legacyCountyId: String(row.county_legacy_id),
        legacyTownshipId: String(row.township_legacy_id),
        educationLevel: String(row.education_level) as CountyDetailDataset['towns'][number]['schools'][number]['educationLevel'],
        managementType: String(row.management_type) as CountyDetailDataset['towns'][number]['schools'][number]['managementType'],
        address: String(row.address),
        phone: String(row.phone),
        website: String(row.website),
        profileUrl: row.profile_url == null ? undefined : String(row.profile_url),
        coordinates: {
          longitude: Number(row.longitude),
          latitude: Number(row.latitude),
        },
        yearlyStudents: yearlyLookup.get(schoolId) ?? [],
        studentCompositions: buildStudentCompositions(schoolId, compositionLookup),
        status: row.status == null ? undefined : String(row.status) as CountyDetailDataset['towns'][number]['schools'][number]['status'],
        missingYears: parseJsonValue(row.missing_years_json, []),
        dataNotes: parseJsonValue(row.data_notes_json, []),
      })
    })

    const detail: CountyDetailDataset = {
      county: {
        id: String(countyRow.legacy_id),
        countyCode,
        legacyCountyId: String(countyRow.legacy_id),
        name: String(countyRow.name),
        shortLabel: String(countyRow.short_label),
        region: String(countyRow.region) as CountyDetailDataset['county']['region'],
      },
      dataNotes: parseJsonValue(countyRow.data_notes_json, []),
      towns: townRows.map((townRow) => ({
        id: String(townRow.legacy_id),
        countyId: String(countyRow.legacy_id),
        countyCode,
        townCode: String(townRow.id),
        legacyTownshipId: String(townRow.legacy_id),
        name: String(townRow.name),
        schools: schoolsByTown.get(String(townRow.legacy_id)) ?? [],
        dataNotes: parseJsonValue(townRow.data_notes_json, []),
      })),
    }
    countyDetailMemoryCache.set(resolvedCountyId, detail)
    recordResourceLoad({
      source: 'sqlite',
      resourceKey: detailFile,
      bytes,
      countyDetailId: resolvedCountyId,
    })
    return detail
  })()

  pendingCountyDetailRequests.set(resolvedCountyId, nextRequest)
  try {
    return await nextRequest
  } finally {
    pendingCountyDetailRequests.delete(resolvedCountyId)
  }
}

export async function loadCountyBuckets(bucketFile: string, countyId?: string) {
  const resolvedCountyId = countyId ?? detectCountyIdFromBucketFile(bucketFile)
  if (countyBucketMemoryCache.has(resolvedCountyId)) {
    recordResourceLoad({
      source: 'memory',
      resourceKey: bucketFile,
      bucketCountyId: resolvedCountyId,
    })
    return countyBucketMemoryCache.get(resolvedCountyId) as CountyBucketDataset
  }

  const pendingRequest = pendingCountyBucketRequests.get(resolvedCountyId)
  if (pendingRequest) {
    return pendingRequest
  }

  const nextRequest = (async () => {
    const { db, bytes } = await loadDatabase()
    const countyCode = resolveCountyCode(resolvedCountyId)
    const countyRows = mapRows(db.exec('SELECT * FROM counties WHERE id = ?', [countyCode]))
    const countyRow = countyRows[0]
    if (!countyRow) {
      throw new Error(`找不到縣市 bucket：${resolvedCountyId}`)
    }

    const bucketRows = mapRows(db.exec('SELECT * FROM school_buckets WHERE county_id = ? ORDER BY precision, bucket_id', [countyCode]))
    const precisions: CountyBucketDataset['precisions'] = {}
    bucketRows.forEach((row) => {
      const precisionKey = String(row.precision)
      if (!precisions[precisionKey]) {
        precisions[precisionKey] = []
      }
      precisions[precisionKey].push({
        id: String(row.bucket_id),
        geohash: String(row.geohash),
        precision: Number(row.precision),
        count: Number(row.school_count),
        totalStudents: Number(row.total_students),
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        bounds: {
          minLatitude: Number(row.min_latitude),
          maxLatitude: Number(row.max_latitude),
          minLongitude: Number(row.min_longitude),
          maxLongitude: Number(row.max_longitude),
        },
        topSchools: parseJsonValue(row.top_schools_json, []),
      })
    })

    const detail: CountyBucketDataset = {
      generatedAt: String(readMeta(db, 'generatedAt') ?? ''),
      county: {
        id: String(countyRow.legacy_id),
        countyCode,
        legacyCountyId: String(countyRow.legacy_id),
        name: String(countyRow.name),
        shortLabel: String(countyRow.short_label),
        region: String(countyRow.region) as CountyBucketDataset['county']['region'],
      },
      precisions,
    }
    countyBucketMemoryCache.set(resolvedCountyId, detail)
    recordResourceLoad({
      source: 'sqlite',
      resourceKey: bucketFile,
      bytes,
      bucketCountyId: resolvedCountyId,
    })
    return detail
  })()

  pendingCountyBucketRequests.set(resolvedCountyId, nextRequest)
  try {
    return await nextRequest
  } finally {
    pendingCountyBucketRequests.delete(resolvedCountyId)
  }
}

export function resetAtlasSqliteCache() {
  sqlDatabasePromise = null
  summaryCache = null
  countyDetailMemoryCache.clear()
  countyBucketMemoryCache.clear()
  pendingCountyDetailRequests.clear()
  pendingCountyBucketRequests.clear()
  countyDetailFileLookup.clear()
  bucketFileLookup.clear()
  countyCodeLookup.clear()
}