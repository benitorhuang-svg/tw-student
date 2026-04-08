self.addEventListener('message', (ev) => {
  const { id, bucketRows } = ev.data || {}

  function parseJsonValue(value, fallback) {
    if (typeof value !== 'string' || !value) return fallback
    try { return JSON.parse(value) } catch { return fallback }
  }

  try {
    const precisions = Object.create(null)
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

    ;(self as any).postMessage({ id, result: { precisions } })
  } catch (err) {
    ;(self as any).postMessage({ id, error: String(err && err.message ? err.message : err) })
  }
})

export {}
