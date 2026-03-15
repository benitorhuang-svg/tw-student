import { recordResourceLoad } from '../atlasLoadObservation'
import { loadDatabase } from './connection'
import { mapRows, parseJsonValue } from './mappers'
import { resolveCountyCode } from './summary'
import type { CountyBucketDataset } from '../educationTypes'

const countyBucketMemoryCache = new Map<string, CountyBucketDataset>()
const pendingCountyBucketRequests = new Map<string, Promise<CountyBucketDataset>>()

export async function loadCountyBuckets(bucketFile: string, countyId?: string) {
  const resolvedCountyId = countyId ?? bucketFile
  if (countyBucketMemoryCache.has(resolvedCountyId)) {
    recordResourceLoad({ source: 'memory', resourceKey: bucketFile, bucketCountyId: resolvedCountyId })
    return countyBucketMemoryCache.get(resolvedCountyId) as CountyBucketDataset
  }

  const pendingRequest = pendingCountyBucketRequests.get(resolvedCountyId)
  if (pendingRequest) return pendingRequest

  const nextRequest = (async () => {
    const { db, bytes } = await loadDatabase()
    const countyCode = resolveCountyCode(resolvedCountyId)
    const countyRows = mapRows(db.exec('SELECT * FROM counties WHERE id = ?', [countyCode]))
    const countyRow = countyRows[0]
    if (!countyRow) throw new Error(`找不到縣市 bucket：${resolvedCountyId}`)

    const bucketRows = mapRows(db.exec('SELECT * FROM school_buckets WHERE county_id = ? ORDER BY precision, bucket_id', [countyCode]))
    const precisions: CountyBucketDataset['precisions'] = {}
    
    bucketRows.forEach((row) => {
      const precisionKey = String(row.precision)
      if (!precisions[precisionKey]) precisions[precisionKey] = []
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

    const metaGeneratedAt = mapRows(db.exec("SELECT value FROM meta WHERE key = 'generatedAt'"))[0]?.value

    const detail: CountyBucketDataset = {
      generatedAt: String(metaGeneratedAt ?? ''),
      county: {
        id: String(countyRow.legacy_id),
        countyCode,
        legacyCountyId: String(countyRow.legacy_id),
        name: String(countyRow.name),
        shortLabel: String(countyRow.short_label),
        region: String(countyRow.region) as any,
      },
      precisions,
    }

    countyBucketMemoryCache.set(resolvedCountyId, detail)
    recordResourceLoad({ source: 'sqlite', resourceKey: bucketFile, bytes, bucketCountyId: resolvedCountyId })
    return detail
  })()

  pendingCountyBucketRequests.set(resolvedCountyId, nextRequest)
  try { return await nextRequest } finally { pendingCountyBucketRequests.delete(resolvedCountyId) }
}

export function resetBucketCache() {
  countyBucketMemoryCache.clear()
  pendingCountyBucketRequests.clear()
}
