/* eslint-disable @typescript-eslint/no-explicit-any */
const ctx: Worker = self as any

ctx.addEventListener('message', (ev) => {
  const { id, bucketRows } = ev.data || {}

  function parseJsonValue<T>(value: string | null | undefined, fallback: T): T {
    if (typeof value !== 'string' || !value) return fallback
    try { return JSON.parse(value) } catch { return fallback }
  }

  try {
    const precisions: Record<string, any[]> = Object.create(null)
    for (const row of bucketRows || []) {
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
    }

    ctx.postMessage({ id, result: { precisions } })
  } catch (err: unknown) {
    ctx.postMessage({ id, error: String((err as any)?.message || err) })
  }
})

export {}
