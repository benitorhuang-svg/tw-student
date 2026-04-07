import { recordResourceLoad } from '../atlasLoadObservation'
import { loadDatabase } from './connection'
import { 
  mapRows, 
  parseJsonValue,
  buildYearlyStudentLookup, 
  buildCompositionLookup, 
  buildStudentCompositions 
} from './mappers'
import { resolveCountyCode } from './summary'
import type { CountyDetailDataset, DataNote, AcademicYear, RegionGroup, SchoolLevel, SchoolManagementType, SchoolRecord } from '../educationTypes'

const countyDetailMemoryCache = new Map<string, CountyDetailDataset>()
const pendingCountyDetailRequests = new Map<string, Promise<CountyDetailDataset>>()

const EMPTY_DATA_NOTES: DataNote[] = []
const EMPTY_ACADEMIC_YEARS: AcademicYear[] = []

export async function loadCountyDetail(detailFile: string, countyId?: string) {
  const resolvedCountyId = countyId ?? detailFile // simplified for atomic refactor
  if (countyDetailMemoryCache.has(resolvedCountyId)) {
    recordResourceLoad({ source: 'memory', resourceKey: detailFile, countyDetailId: resolvedCountyId })
    return countyDetailMemoryCache.get(resolvedCountyId) as CountyDetailDataset
  }

  const pendingRequest = pendingCountyDetailRequests.get(resolvedCountyId)
  if (pendingRequest) return pendingRequest

  const nextRequest = (async () => {
    const { db, bytes } = await loadDatabase()
    const countyCode = resolveCountyCode(resolvedCountyId)
    const countyRows = mapRows(db.exec('SELECT * FROM counties WHERE id = ?', [countyCode]))
    const countyRow = countyRows[0]
    if (!countyRow) throw new Error(`找不到縣市資料：${resolvedCountyId}`)

    const townRows = mapRows(db.exec('SELECT * FROM towns WHERE county_id = ? ORDER BY name', [countyCode]))
    const schoolRows = mapRows(db.exec('SELECT * FROM schools WHERE county_id = ? ORDER BY township_legacy_id, name', [countyCode]))
    const yearRows = mapRows(db.exec(`
      SELECT school_year_metrics.* FROM school_year_metrics
      JOIN schools ON schools.id = school_year_metrics.school_id
      WHERE schools.county_id = ? ORDER BY school_year_metrics.school_id, school_year_metrics.year
    `, [countyCode]))
    const compositionSummaryRows = mapRows(db.exec(`
      SELECT school_composition_summaries.* FROM school_composition_summaries
      JOIN schools ON schools.id = school_composition_summaries.school_id
      WHERE schools.county_id = ? ORDER BY school_composition_summaries.school_id, school_composition_summaries.year
    `, [countyCode]))
    const compositionRows = mapRows(db.exec(`
      SELECT school_compositions.* FROM school_compositions
      JOIN schools ON schools.id = school_compositions.school_id
      WHERE schools.county_id = ? ORDER BY school_compositions.school_id, school_compositions.year, school_compositions.band_id
    `, [countyCode]))

    const yearlyLookup = buildYearlyStudentLookup(yearRows)
    const compositionLookup = buildCompositionLookup(compositionSummaryRows, compositionRows)
    const schoolsByTown = new Map<string, SchoolRecord[]>()

    schoolRows.forEach((row) => {
      const townshipKey = String(row.township_legacy_id)
      if (!schoolsByTown.has(townshipKey)) schoolsByTown.set(townshipKey, [])
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
        educationLevel: String(row.education_level) as SchoolLevel,
        managementType: String(row.management_type) as SchoolManagementType,
        address: String(row.address),
        phone: String(row.phone),
        website: String(row.website),
        profileUrl: row.profile_url == null ? undefined : String(row.profile_url),
        coordinates: { longitude: Number(row.longitude), latitude: Number(row.latitude) },
        yearlyStudents: yearlyLookup.get(schoolId) ?? [],
        studentCompositions: buildStudentCompositions(schoolId, compositionLookup),
        status: row.status == null ? undefined : (String(row.status) as SchoolRecord['status']),
        missingYears: parseJsonValue(String(row.missing_years_json || '[]'), EMPTY_ACADEMIC_YEARS),
        dataNotes: parseJsonValue(String(row.data_notes_json || '[]'), EMPTY_DATA_NOTES),
      })
    })

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
        schools: schoolsByTown.get(String(townRow.legacy_id)) ?? [],
        dataNotes: parseJsonValue(String(townRow.data_notes_json || '[]'), EMPTY_DATA_NOTES),
      })),
    }

    countyDetailMemoryCache.set(resolvedCountyId, detail)
    recordResourceLoad({ source: 'sqlite', resourceKey: detailFile, bytes, countyDetailId: resolvedCountyId })
    return detail
  })()

  pendingCountyDetailRequests.set(resolvedCountyId, nextRequest)
  try { return await nextRequest } finally { pendingCountyDetailRequests.delete(resolvedCountyId) }
}

export function resetDetailCache() {
  countyDetailMemoryCache.clear()
  pendingCountyDetailRequests.clear()
}
