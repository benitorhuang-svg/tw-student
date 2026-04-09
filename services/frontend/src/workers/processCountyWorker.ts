/* eslint-disable @typescript-eslint/no-explicit-any */
const ctx: Worker = self as any

ctx.addEventListener('message', (ev: MessageEvent) => {
  const { id, schoolRows, yearRows, compositionSummaryRows, compositionRows } = ev.data || {}

  function parseJsonValue<T>(value: string | null | undefined, fallback: T): T {
    if (typeof value !== 'string' || !value) return fallback
    try { return JSON.parse(value) } catch { return fallback }
  }

  function buildYearlyStudentLookup(rows: any[]) {
    const lookup: Record<string, any[]> = Object.create(null)
    for (const row of rows) {
      const key = String(row.school_id)
      lookup[key] = lookup[key] || []
      lookup[key].push({ year: Number(row.year), students: Number(row.students), valueStatus: String(row.value_status), isEstimated: Number(row.is_estimated) === 1 || undefined, isMissing: Number(row.is_missing) === 1 || undefined })
    }
    for (const k of Object.keys(lookup)) {
      lookup[k].sort((a: any, b: any) => a.year - b.year)
    }
    return lookup
  }

  function buildCompositionLookup(summaryRows: any[], bandRows: any[]) {
    const summaries: Record<string, any> = Object.create(null)
    const bands: Record<string, any[]> = Object.create(null)
    for (const row of summaryRows) {
      summaries[`${row.school_id}:${row.year}`] = row
    }
    for (const row of bandRows) {
      const key = `${row.school_id}:${row.year}`
      bands[key] = bands[key] || []
      bands[key].push(row)
    }
    return { summaries, bands }
  }

  function buildStudentCompositions(schoolId: string, lookup: any) {
    const years = new Set<number>()
    for (const k of Object.keys(lookup.summaries || {})) if (k.startsWith(`${schoolId}:`)) years.add(Number(k.split(':').pop()))
    for (const k of Object.keys(lookup.bands || {})) if (k.startsWith(`${schoolId}:`)) years.add(Number(k.split(':').pop()))
    return [...years].sort((a, b) => a - b).map((year) => {
      const summaryRow = lookup.summaries?.[`${schoolId}:${year}`]
      const bandEntries = lookup.bands?.[`${schoolId}:${year}`] || []
      return {
        year,
        totalStudents: Number(summaryRow?.total_students ?? 0),
        maleStudents: summaryRow?.male_students == null ? undefined : Number(summaryRow.male_students),
        femaleStudents: summaryRow?.female_students == null ? undefined : Number(summaryRow.female_students),
        bands: bandEntries.map((band: any) => ({ 
          id: String(band.band_id), 
          label: String(band.band_label), 
          category: String(band.category), 
          totalStudents: Number(band.total_students), 
          maleStudents: band.male_students == null ? undefined : Number(band.male_students), 
          femaleStudents: band.female_students == null ? undefined : Number(band.female_students) 
        }))
      }
    })
  }

  try {
    const yearlyLookup = buildYearlyStudentLookup(yearRows || [])
    const compositionLookup = buildCompositionLookup(compositionSummaryRows || [], compositionRows || [])

    const schoolsByTown: Record<string, any[]> = Object.create(null)
    for (const row of schoolRows || []) {
      const townshipKey = String(row.township_legacy_id)
      schoolsByTown[townshipKey] = schoolsByTown[townshipKey] || []
      const schoolId = String(row.id)
      schoolsByTown[townshipKey].push({
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
        educationLevel: String(row.education_level),
        managementType: String(row.management_type),
        address: String(row.address),
        phone: String(row.phone),
        website: String(row.website),
        profileUrl: row.profile_url == null ? undefined : String(row.profile_url),
        coordinates: { longitude: Number(row.longitude), latitude: Number(row.latitude) },
        yearlyStudents: yearlyLookup[schoolId] || [],
        studentCompositions: buildStudentCompositions(schoolId, compositionLookup),
        status: row.status == null ? undefined : String(row.status),
        missingYears: parseJsonValue(String(row.missing_years_json || '[]'), []),
        dataNotes: parseJsonValue(String(row.data_notes_json || '[]'), []),
      })
    }

    ctx.postMessage({ id, result: { schoolsByTown } })
  } catch (err: unknown) {
    ctx.postMessage({ id, error: String((err as any)?.message || err) })
  }
})

export {}
