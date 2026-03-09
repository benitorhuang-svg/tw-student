import {
  ACADEMIC_YEARS,
  buildSummaryBucketKey,
  type AcademicYear,
  type CountyRecord,
  type CountySummaryRecord,
  type SchoolRecord,
  type SummaryTrendRecord,
  type TownshipRecord,
} from '../data/educationData'
import type { DashboardFilters, TrendPoint } from './analytics.types'

export function previousYearOf(year: AcademicYear) {
  const index = ACADEMIC_YEARS.indexOf(year)
  return index > 0 ? ACADEMIC_YEARS[index - 1] : null
}

export function getStudentsForYear(school: SchoolRecord, year: AcademicYear) {
  return school.yearlyStudents.find((record) => record.year === year)?.students ?? 0
}

export function matchesText(haystack: string, searchText: string) {
  return haystack.toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
}

export function matchesSchoolFilters(
  school: SchoolRecord,
  filters: DashboardFilters,
  countyName: string,
  townshipName: string,
) {
  if (filters.educationLevel !== '全部' && school.educationLevel !== filters.educationLevel) {
    return false
  }

  if (filters.managementType !== '全部' && school.managementType !== filters.managementType) {
    return false
  }

  if (!filters.searchText.trim()) {
    return true
  }

  const searchText = filters.searchText.trim()
  return [school.name, school.code, countyName, townshipName].some((value) => matchesText(value, searchText))
}

export function aggregateSchools(schools: SchoolRecord[], year: AcademicYear) {
  const previousYear = previousYearOf(year)
  const currentStudents = schools.reduce((sum, school) => sum + getStudentsForYear(school, year), 0)
  const previousStudents = previousYear
    ? schools.reduce((sum, school) => sum + getStudentsForYear(school, previousYear), 0)
    : currentStudents
  const delta = currentStudents - previousStudents

  return {
    students: currentStudents,
    schools: schools.length,
    delta,
    deltaRatio: previousStudents === 0 ? 0 : delta / previousStudents,
    trend: ACADEMIC_YEARS.map((trackedYear) => ({
      year: trackedYear,
      value: schools.reduce((sum, school) => sum + getStudentsForYear(school, trackedYear), 0),
    })) satisfies TrendPoint[],
  }
}

export function aggregateSummarySeries(summaryTrend: SummaryTrendRecord[], year: AcademicYear) {
  const current = summaryTrend.find((entry) => entry.year === year)
  const previousYear = previousYearOf(year)
  const previous = previousYear ? summaryTrend.find((entry) => entry.year === previousYear) : current
  const students = current?.students ?? 0
  const schools = current?.schools ?? 0
  const previousStudents = previous?.students ?? students
  const delta = students - previousStudents

  return {
    students,
    schools,
    delta,
    deltaRatio: previousStudents === 0 ? 0 : delta / previousStudents,
    trend: summaryTrend.map((entry) => ({ year: entry.year, value: entry.students })),
  }
}

export function getSummaryTrend(
  summaries: Record<string, SummaryTrendRecord[]>,
  filters: Pick<DashboardFilters, 'educationLevel' | 'managementType'>,
) {
  return (
    summaries[buildSummaryBucketKey(filters.educationLevel, filters.managementType)] ??
    summaries[buildSummaryBucketKey('全部', '全部')] ??
    []
  )
}

export function matchesSummarySearch(county: CountySummaryRecord, filters: Pick<DashboardFilters, 'searchText'>) {
  const searchText = filters.searchText.trim()
  if (!searchText) {
    return true
  }

  // School code search (all digits): don't filter out counties at summary level
  if (/^\d{4,}$/.test(searchText)) {
    return true
  }

  return [county.name, ...county.towns.map((town) => town.name)].some((value) => matchesText(value, searchText))
}

export function getFilteredSchoolsForTownship(township: TownshipRecord, county: CountyRecord, filters: DashboardFilters) {
  return township.schools.filter((school) => matchesSchoolFilters(school, filters, county.name, township.name))
}