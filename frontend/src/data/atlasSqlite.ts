import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

import { recordResourceLoad } from './atlasLoadObservation'
import type {
  CountyBucketDataset,
  CountyDetailDataset,
  CountySummaryRecord,
  EducationSummaryDataset,
} from './educationTypes'

const DATA_BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '')
const SQLITE_RESOURCE_KEY = 'sqlite:education-atlas.sqlite'

let sqlDatabasePromise: Promise<DatabaseHandle> | null = null
let summaryCache: EducationSummaryDataset | null = null
const countyDetailMemoryCache = new Map<string, CountyDetailDataset>()
const countyBucketMemoryCache = new Map<string, CountyBucketDataset>()
const pendingCountyDetailRequests = new Map<string, Promise<CountyDetailDataset>>()
const pendingCountyBucketRequests = new Map<string, Promise<CountyBucketDataset>>()
const countyDetailFileLookup = new Map<string, string>()
const bucketFileLookup = new Map<string, string>()

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
  const baseUrl = `${DATA_BASE_URL}/data/education-atlas.sqlite`
  return forceRefresh ? `${baseUrl}?refresh=${Date.now()}` : baseUrl
}

function detectCountyIdFromDetailFile(detailFile: string) {
  return countyDetailFileLookup.get(detailFile) ?? detailFile.replace(/^counties\//, '').replace(/\.json$/, '')
}

function detectCountyIdFromBucketFile(bucketFile: string) {
  return bucketFileLookup.get(bucketFile) ?? bucketFile.replace(/^buckets\//, '').replace(/\.json$/, '')
}

function mapRows(result: Array<{ columns: string[]; values: unknown[][] }>) {
  return result.flatMap((entry) => entry.values.map((values) => Object.fromEntries(entry.columns.map((column, index) => [column, values[index]]))))
}

async function loadDatabase(options: LoadDatabaseOptions = {}) {
  if (options.forceRefresh) {
    sqlDatabasePromise = null
  }

  if (!sqlDatabasePromise) {
    sqlDatabasePromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => wasmUrl })
      const response = await fetch(getDatabaseUrl(options.forceRefresh), {
        cache: options.forceRefresh ? 'no-store' : 'default',
      })
      if (!response.ok) {
        throw new Error(`無法載入 SQLite 資料庫 (${response.status})`)
      }

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

function queryJsonPayload<T>(database: DatabaseHandle['db'], sql: string, params: unknown[]) {
  const rows = mapRows(database.exec(sql, params)) as Array<SqlValueRow>
  const payload = rows[0]?.payload_json
  if (typeof payload !== 'string') {
    throw new Error('SQLite 查詢缺少 payload_json')
  }

  return JSON.parse(payload) as T
}

function registerCountyLookups(counties: CountySummaryRecord[]) {
  countyDetailFileLookup.clear()
  bucketFileLookup.clear()
  counties.forEach((county) => {
    countyDetailFileLookup.set(county.detailFile, county.id)
    bucketFileLookup.set(county.bucketFile, county.id)
  })
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
  const summary = queryJsonPayload<EducationSummaryDataset>(db, 'SELECT payload_json FROM summary_views WHERE id = ?', ['education-summary'])
  summary.assetMetrics = {
    countyBoundaryBytes: summary.assetMetrics?.countyBoundaryBytes ?? 0,
    countyDetailBytes: summary.assetMetrics?.countyDetailBytes ?? 0,
    townshipBoundaryBytes: summary.assetMetrics?.townshipBoundaryBytes ?? 0,
    countyBucketBytes: summary.assetMetrics?.countyBucketBytes,
    summaryBytes: summary.assetMetrics?.summaryBytes,
    sqliteBytes: bytes,
  }
  summary.counties = summary.counties.map((county) => ({
    ...county,
    assetMetrics: {
      detailBytes: county.assetMetrics?.detailBytes ?? 0,
      townshipBytes: county.assetMetrics?.townshipBytes ?? 0,
      bucketBytes: county.assetMetrics?.bucketBytes ?? 0,
      sqliteBytes: bytes,
    },
  }))
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
    const detail = queryJsonPayload<CountyDetailDataset>(db, 'SELECT payload_json FROM county_detail_views WHERE county_id = ?', [resolvedCountyId])
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
    const detail = queryJsonPayload<CountyBucketDataset>(db, 'SELECT payload_json FROM county_bucket_views WHERE county_id = ?', [resolvedCountyId])
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
}