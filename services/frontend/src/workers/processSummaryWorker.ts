// Worker: build the EducationSummaryDataset structure from raw SQL row arrays
self.addEventListener('message', (ev) => {
  const { id, payload } = ev.data || {}
  try {
    const {
      yearsJson,
      sourcesJson,
      dataNotesJson,
      generatedAtJson,
      countyRows,
      townRows,
      countySummaryRows,
      townSummaryRows,
      coordinateIssueRows,
      schoolIndexRows,
    } = payload || {}

    function parseJsonValue(value: any, fallback: any) {
      if (typeof value !== 'string' || !value) return fallback
      try { return JSON.parse(value) } catch { return fallback }
    }

    // build summary maps
    function buildSummaryMap(rows: any[]) {
      // Keys must match buildSummaryBucketKey `${educationLevel}|${managementType}`
      const EDUCATION_LEVELS = ['全部', '國小', '國中', '高中職', '大專院校']
      const MANAGEMENT_TYPES = ['全部', '公立', '私立']

      const baseLevels = ['國小', '國中', '高中職', '大專院校']
      const baseMgmt = ['公立', '私立']

      const summaries = {}
      // init empty arrays for all exact combos
      for (const el of baseLevels) {
        for (const mg of baseMgmt) {
          const k = `${el}|${mg}`
          summaries[k] = []
        }
      }

      // push raw rows into exact keys
      for (const row of rows || []) {
        const el = String(row.education_level || '')
        const mg = String(row.management_type || '')
        const key = `${el}|${mg}`
        if (!summaries[key]) summaries[key] = []
        summaries[key].push({ year: Number(row.year), students: Number(row.students), schools: Number(row.schools) })
      }

      // helper to merge multiple buckets by year
      function mergeBuckets(keys: string[]) {
        const yearMap = new Map()
        for (const k of keys) {
          const items = summaries[k] || []
          for (const it of items) {
            const y = Number(it.year)
            const cur = yearMap.get(y) || { students: 0, schools: 0 }
            cur.students += Number(it.students || 0)
            cur.schools += Number(it.schools || 0)
            yearMap.set(y, cur)
          }
        }
        const out = Array.from(yearMap.entries()).map(([year, v]) => ({ year: Number(year), students: v.students, schools: v.schools }))
        out.sort((a, b) => a.year - b.year)
        return out
      }

      // build aggregated keys that include '全部'
      for (const mg of MANAGEMENT_TYPES) {
        if (mg === '全部') {
          // 全部|全部 will be set below
          continue
        }
        const keys = baseLevels.map((el) => `${el}|${mg}`)
        summaries[`全部|${mg}`] = mergeBuckets(keys)
      }

      for (const el of EDUCATION_LEVELS) {
        if (el === '全部') continue
        const keys = baseMgmt.map((mg) => `${el}|${mg}`)
        summaries[`${el}|全部`] = mergeBuckets(keys)
      }

      // 全部|全部: merge all exact combos
      const allKeys = baseLevels.flatMap((el) => baseMgmt.map((mg) => `${el}|${mg}`))
      summaries['全部|全部'] = mergeBuckets(allKeys)

      // ensure all keys exist even if empty
      for (const el of EDUCATION_LEVELS) {
        for (const mg of MANAGEMENT_TYPES) {
          const k = `${el}|${mg}`
          if (!summaries[k]) summaries[k] = []
        }
      }

      return summaries
    }

    function buildSchoolCodeIndex(rows: any[]) {
      const levelOrder = new Map([['國小',1],['國中',2],['高中職',3],['大專院校',4]])
      const schoolCodeIndex = {}
      for (const row of rows) {
        const code = String(row.code)
        const current = schoolCodeIndex[code]
        const nextLevels = Array.from(new Set([...(current?.levels||[]), String(row.education_level)])).sort((l,r)=> (levelOrder.get(l)||99)-(levelOrder.get(r)||99))
        schoolCodeIndex[code] = {
          countyId: current?.countyId ?? String(row.county_legacy_id),
          townshipId: current?.townshipId ?? String(row.township_legacy_id),
          countyCode: current?.countyCode ?? String(row.county_id),
          townCode: current?.townCode ?? String(row.township_id),
          countyName: current?.countyName ?? String(row.county_name),
          townshipName: current?.townshipName ?? String(row.township_name),
          name: current?.name ?? String(row.name),
          schoolIds: [...new Set([...(current?.schoolIds||[]), String(row.legacy_id)])],
          levels: nextLevels,
          longitude: current?.longitude ?? Number(row.longitude),
          latitude: current?.latitude ?? Number(row.latitude),
        }
      }
      return schoolCodeIndex
    }

    const years = parseJsonValue(yearsJson, [])
    const sources = parseJsonValue(sourcesJson, { points: '', statistics: '', townshipBoundaries: '', countyBoundaries: '' })
    const dataNotes = parseJsonValue(dataNotesJson, [])
    const generatedAt = String(parseJsonValue(generatedAtJson, '') || '')

    const countySummaryLookup = {}
    for (const row of countySummaryRows || []) {
      const key = String(row.county_id)
      countySummaryLookup[key] = countySummaryLookup[key] || []
      countySummaryLookup[key].push(row)
    }

    const townSummaryLookup = {}
    for (const row of townSummaryRows || []) {
      const key = String(row.town_id)
      townSummaryLookup[key] = townSummaryLookup[key] || []
      townSummaryLookup[key].push(row)
    }

    const townRowsByCounty = {}
    for (const row of townRows || []) {
      const key = String(row.county_id)
      townRowsByCounty[key] = townRowsByCounty[key] || []
      townRowsByCounty[key].push(row)
    }

    const counties = (countyRows || []).map((countyRow) => {
      const countyCode = String(countyRow.id)
      const towns = (townRowsByCounty[countyCode] || []).map((townRow) => ({
        id: String(townRow.legacy_id),
        countyId: String(countyRow.legacy_id),
        countyCode,
        townCode: String(townRow.id),
        legacyTownshipId: String(townRow.legacy_id),
        name: String(townRow.name),
        dataNotes: parseJsonValue(townRow.data_notes_json, []),
        summaries: buildSummaryMap(townSummaryLookup[String(townRow.id)] || []),
      }))

      return {
        id: String(countyRow.legacy_id),
        countyCode,
        legacyCountyId: String(countyRow.legacy_id),
        name: String(countyRow.name),
        shortLabel: String(countyRow.short_label),
        region: String(countyRow.region),
        townshipFile: String(countyRow.township_file),
        detailFile: String(countyRow.detail_file),
        bucketFile: String(countyRow.bucket_file),
        assetMetrics: {
          detailBytes: Number(countyRow.detail_bytes),
          bucketBytes: Number(countyRow.bucket_bytes),
          townshipBytes: Number(countyRow.township_bytes),
          sqliteBytes: 0,
        },
        dataNotes: parseJsonValue(countyRow.data_notes_json, []),
        summaries: buildSummaryMap(countySummaryLookup[countyCode] || []),
        towns,
      }
    })

    const summary = {
      generatedAt,
      years,
      dataNotes,
      assetMetrics: {
        countyBoundaryBytes: 0,
        countyDetailBytes: counties.reduce((s: number, c: any) => s + (c.assetMetrics?.detailBytes || 0), 0),
        townshipBoundaryBytes: counties.reduce((s: number, c: any) => s + (c.assetMetrics?.townshipBytes || 0), 0),
        countyBucketBytes: counties.reduce((s: number, c: any) => s + (c.assetMetrics?.bucketBytes || 0), 0),
        sqliteBytes: 0,
      },
      sources,
      schoolCodeIndex: buildSchoolCodeIndex(schoolIndexRows || []),
      missingCoordinates: (coordinateIssueRows || []).map((row: any) => ({
        code: String(row.code),
        name: String(row.school_name),
        county: String(row.county_legacy_id),
        township: String(row.township_legacy_id).split(':').slice(1).join(':') || String(row.township_legacy_id),
        countyCode: String(row.county_id),
        townCode: String(row.town_id || row.township_id),
        level: String(row.school_level),
        address: String(row.address || ''),
        longitude: row.longitude == null ? undefined : Number(row.longitude),
        latitude: row.latitude == null ? undefined : Number(row.latitude),
        coordinateResolution: row.coordinate_resolution == null ? undefined : String(row.coordinate_resolution),
        coordinateMatchType: row.coordinate_match_type == null ? undefined : String(row.coordinate_match_type),
        coordinateMatchScore: row.coordinate_match_score == null ? undefined : Number(row.coordinate_match_score),
      })),
      counties,
    }

    ;(self as any).postMessage({ id, result: summary })
  } catch (err) {
    ;(self as any).postMessage({ id, error: String((err as any)?.message || err) })
  }
})

export {}
