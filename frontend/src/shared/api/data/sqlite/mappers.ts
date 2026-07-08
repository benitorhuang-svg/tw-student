import { EDUCATION_LEVELS, MANAGEMENT_TYPES, buildSummaryBucketKey } from '../educationTypes'
import type { 
  AcademicYear, 
  EducationSummaryDataset, 
  EducationLevelFilter,
  ManagementTypeFilter,
  SummaryBucketKey, 
  SummaryTrendRecord, 
  TrendRecord,
  StudentCompositionRecord
} from '../educationTypes'

export type SqlValueRow = Record<string, unknown>

export function mapRows(result: Array<{ columns: string[]; values: unknown[][] }>) {
  return result.flatMap((entry) => entry.values.map((values) => Object.fromEntries(entry.columns.map((column, index) => [column, values[index]]))))
}

export function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function buildSummaryMap(rows: SqlValueRow[]) {
  const summaries = Object.fromEntries(
    EDUCATION_LEVELS.flatMap((educationLevel) => MANAGEMENT_TYPES.map((managementType) => [
      buildSummaryBucketKey(educationLevel, managementType),
      [] as SummaryTrendRecord[],
    ])),
  ) as Record<SummaryBucketKey, SummaryTrendRecord[]>

  rows.forEach((row) => {
    const bucketKey = buildSummaryBucketKey(
      String(row.education_level) as EducationLevelFilter,
      String(row.management_type) as ManagementTypeFilter,
    )
    summaries[bucketKey].push({
      year: Number(row.year) as AcademicYear,
      students: Number(row.students),
      schools: Number(row.schools),
    })
  })

  Object.values(summaries).forEach((items) => items.sort((left, right) => left.year - right.year))
  return summaries
}

export function buildYearlyStudentLookup(rows: SqlValueRow[]) {
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

export function buildCompositionLookup(summaryRows: SqlValueRow[], bandRows: SqlValueRow[]) {
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

export function buildStudentCompositions(
  schoolId: string,
  compositionLookup: { summaries: Map<string, SqlValueRow>, bands: Map<string, SqlValueRow[]> },
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

export function buildSchoolCodeIndex(rows: SqlValueRow[]) {
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
