import { recordResourceLoad } from '../atlasLoadObservation'
import { mapRows, parseJsonValue } from './mappers'
import { processCountyRowsInWorker } from './mapperWorkerClient'
import { resolveCountyCode } from './summary'
import type { CountyDetailDataset, DataNote, RegionGroup } from '../educationTypes'

const countyDetailMemoryCache = new Map<string, CountyDetailDataset>()
const pendingCountyDetailRequests = new Map<string, Promise<CountyDetailDataset>>()

// LRU cache and concurrency controls (auto-tuned by device capabilities)
function getDeviceMemory() {
  try { return (navigator as any)?.deviceMemory || 4 } catch { return 4 }
}

function getHardwareConcurrency() {
  try { return navigator?.hardwareConcurrency || 4 } catch { return 4 }
}

function getMaxCacheEntries() {
  const dm = getDeviceMemory()
  // scale cache with device memory: 2-3 entries per GB, clamp
  return Math.min(32, Math.max(4, Math.floor(dm * 3)))
}

function getMaxConcurrentDetailLoads() {
  const hc = getHardwareConcurrency()
  return Math.min(8, Math.max(1, Math.floor(hc / 2)))
}

let activeDetailLoads = 0
const detailLoadQueue: Array<() => void> = []

function getFromDetailCache(key: string) {
  const v = countyDetailMemoryCache.get(key)
  if (!v) return null
  // mark as recently used
  countyDetailMemoryCache.delete(key)
  countyDetailMemoryCache.set(key, v)
  return v
}

function setToDetailCache(key: string, value: CountyDetailDataset) {
  countyDetailMemoryCache.set(key, value)
  // evict oldest entries if cache exceeds dynamic size
  const maxEntries = getMaxCacheEntries()
  while (countyDetailMemoryCache.size > maxEntries) {
    const firstKey = countyDetailMemoryCache.keys().next().value as string
    countyDetailMemoryCache.delete(firstKey)
  }
}

function acquireDetailSlot(): Promise<void> {
  if (activeDetailLoads < getMaxConcurrentDetailLoads()) {
    activeDetailLoads++
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    detailLoadQueue.push(() => {
      activeDetailLoads++
      resolve()
    })
  })
}

function releaseDetailSlot() {
  activeDetailLoads = Math.max(0, activeDetailLoads - 1)
  const next = detailLoadQueue.shift()
  if (next) next()
}

const EMPTY_DATA_NOTES: DataNote[] = []



export async function loadCountyDetail(detailFile: string, countyId?: string) {
  const resolvedCountyId = countyId ?? detailFile // simplified for atomic refactor
  const cached = getFromDetailCache(resolvedCountyId)
  if (cached) {
    recordResourceLoad({ source: 'memory', resourceKey: detailFile, countyDetailId: resolvedCountyId })
    return cached
  }

  const pendingRequest = pendingCountyDetailRequests.get(resolvedCountyId)
  if (pendingRequest) return pendingRequest

  const nextRequest = (async () => {
    await acquireDetailSlot()
    try {
      const countyCode = resolveCountyCode(resolvedCountyId)
      const countyRows = mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite('SELECT * FROM counties WHERE id = ?', [countyCode])))
      // bytes not available from worker client; record with 0 for now
      const countyRow = countyRows[0]
      if (!countyRow) throw new Error(`找不到縣市資料：${resolvedCountyId}`)

      const townRows = mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite('SELECT * FROM towns WHERE county_id = ? ORDER BY name', [countyCode])))
      const schoolRows = mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite('SELECT * FROM schools WHERE county_id = ? ORDER BY township_legacy_id, name', [countyCode])))
      const yearRows = mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite(`
        SELECT school_year_metrics.* FROM school_year_metrics
        JOIN schools ON schools.id = school_year_metrics.school_id
        WHERE schools.county_id = ? ORDER BY school_year_metrics.school_id, school_year_metrics.year
      `, [countyCode])))
      const compositionSummaryRows = mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite(`
        SELECT school_composition_summaries.* FROM school_composition_summaries
        JOIN schools ON schools.id = school_composition_summaries.school_id
        WHERE schools.county_id = ? ORDER BY school_composition_summaries.school_id, school_composition_summaries.year
      `, [countyCode])))
      const compositionRows = mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite(`
        SELECT school_compositions.* FROM school_compositions
        JOIN schools ON schools.id = school_compositions.school_id
        WHERE schools.county_id = ? ORDER BY school_compositions.school_id, school_compositions.year, school_compositions.band_id
      `, [countyCode])))

      // Offload heavy row -> object mapping to a worker
      const processed = await processCountyRowsInWorker({ schoolRows, yearRows, compositionSummaryRows, compositionRows })
      const schoolsByTownObj = processed?.schoolsByTown || {}

      const detail: CountyDetailDataset = {
        county: {
          id: String(countyRow.legacy_id),
          countyCode,
          legacyCountyId: String(countyRow.legacy_id),
          name: String(countyRow.name),
          shortLabel: String(countyRow.short_label),
          region: String(countyRow.region) as RegionGroup,
        },
        dataNotes: parseJsonValue(String(countyRow.data_notes_json || '[]'), EMPTY_DATA_NOTES),
        towns: townRows.map((townRow) => ({
          id: String(townRow.legacy_id),
          countyId: String(countyRow.legacy_id),
          countyCode,
          townCode: String(townRow.id),
          legacyTownshipId: String(townRow.legacy_id),
          name: String(townRow.name),
          schools: schoolsByTownObj[String(townRow.legacy_id)] ?? [],
          dataNotes: parseJsonValue(String(townRow.data_notes_json || '[]'), EMPTY_DATA_NOTES),
        })),
      }

      setToDetailCache(resolvedCountyId, detail)
      try { recordResourceLoad({ source: 'sqlite', resourceKey: detailFile, bytes: 0, countyDetailId: resolvedCountyId }) } catch {}
      return detail
    } finally {
      releaseDetailSlot()
    }
  })()

  pendingCountyDetailRequests.set(resolvedCountyId, nextRequest)
  try { return await nextRequest } finally { pendingCountyDetailRequests.delete(resolvedCountyId) }
}

export function resetDetailCache() {
  countyDetailMemoryCache.clear()
  pendingCountyDetailRequests.clear()
}

// Load a spatial slice of county detail restricted to the provided bounding box.
// This avoids loading the entire county schools table when only a viewport subset
// is needed. This function intentionally does not populate the full in-memory
// `countyDetailMemoryCache` to avoid polluting the cache with many slice variants.
export async function loadCountyDetailSlice(
  detailFile: string,
  countyId?: string,
  bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
) {
  const resolvedCountyId = countyId ?? detailFile

  const countyCode = resolveCountyCode(resolvedCountyId)
  const countyRows = mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite('SELECT * FROM counties WHERE id = ?', [countyCode])))
  const countyRow = countyRows[0]
  if (!countyRow) throw new Error(`找不到縣市資料：${resolvedCountyId}`)

  const townRows = mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite('SELECT * FROM towns WHERE county_id = ? ORDER BY name', [countyCode])))

  // Restrict school rows by bounding box when provided.
  const schoolParams: Array<string | number> = [countyCode]
  let schoolSql = 'SELECT * FROM schools WHERE county_id = ?'
  if (bounds) {
    schoolSql += ' AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?'
    schoolParams.push(bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng)
  }
  schoolSql += ' ORDER BY township_legacy_id, name'
  const schoolRows = mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite(schoolSql, schoolParams)))

  // If no schools in slice, return empty towns to avoid further work
  if (!schoolRows.length) {
    const detail: CountyDetailDataset = {
      county: {
        id: String(countyRow.legacy_id),
        countyCode,
        legacyCountyId: String(countyRow.legacy_id),
        name: String(countyRow.name),
        shortLabel: String(countyRow.short_label),
        region: String(countyRow.region) as RegionGroup,
      },
      dataNotes: parseJsonValue(String(countyRow.data_notes_json || '[]'), EMPTY_DATA_NOTES),
      towns: townRows.map((townRow) => ({
        id: String(townRow.legacy_id),
        countyId: String(countyRow.legacy_id),
        countyCode,
        townCode: String(townRow.id),
        legacyTownshipId: String(townRow.legacy_id),
        name: String(townRow.name),
        schools: [],
        dataNotes: parseJsonValue(String(townRow.data_notes_json || '[]'), EMPTY_DATA_NOTES),
      })),
    }

    return detail
  }

  // Build lookups only for the schools in the slice to limit subsequent joins
  const schoolIds = schoolRows.map((r) => String(r.id))

  const placeholders = schoolIds.map(() => '?').join(',')

  const yearRows = schoolIds.length
    ? mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite(
        `
      SELECT school_year_metrics.* FROM school_year_metrics
      JOIN schools ON schools.id = school_year_metrics.school_id
      WHERE schools.county_id = ? AND schools.id IN (${placeholders}) ORDER BY school_year_metrics.school_id, school_year_metrics.year
    `,
        [countyCode, ...schoolIds]
      )))
    : []

  const compositionSummaryRows = schoolIds.length
    ? mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite(
        `
      SELECT school_composition_summaries.* FROM school_composition_summaries
      JOIN schools ON schools.id = school_composition_summaries.school_id
      WHERE schools.county_id = ? AND schools.id IN (${placeholders}) ORDER BY school_composition_summaries.school_id, school_composition_summaries.year
    `,
        [countyCode, ...schoolIds]
      )))
    : []

  const compositionRows = schoolIds.length
    ? mapRows(await import('./sqliteWorkerClient').then(m => m.execInSqlite(
        `
      SELECT school_compositions.* FROM school_compositions
      JOIN schools ON schools.id = school_compositions.school_id
      WHERE schools.county_id = ? AND schools.id IN (${placeholders}) ORDER BY school_compositions.school_id, school_compositions.year, school_compositions.band_id
    `,
        [countyCode, ...schoolIds]
      )))
    : []

  // Offload heavy mapping to worker to avoid blocking the main thread
  await acquireDetailSlot()
  try {
    const processed = await processCountyRowsInWorker({ schoolRows, yearRows, compositionSummaryRows, compositionRows })
    const schoolsByTownObj = processed?.schoolsByTown || {}

    const detail: CountyDetailDataset = {
      county: {
        id: String(countyRow.legacy_id),
        countyCode,
        legacyCountyId: String(countyRow.legacy_id),
        name: String(countyRow.name),
        shortLabel: String(countyRow.short_label),
        region: String(countyRow.region) as RegionGroup,
      },
      dataNotes: parseJsonValue(String(countyRow.data_notes_json || '[]'), EMPTY_DATA_NOTES),
      towns: townRows.map((townRow) => ({
        id: String(townRow.legacy_id),
        countyId: String(countyRow.legacy_id),
        countyCode,
        townCode: String(townRow.id),
        legacyTownshipId: String(townRow.legacy_id),
        name: String(townRow.name),
        schools: schoolsByTownObj[String(townRow.legacy_id)] ?? [],
        dataNotes: parseJsonValue(String(townRow.data_notes_json || '[]'), EMPTY_DATA_NOTES),
      })),
    }

    return detail
  } finally {
    releaseDetailSlot()
  }
}
