import { ACADEMIC_YEARS, buildSummaryBucketKey, type AcademicYear, type CountyRecord, type CountySummaryRecord, type EducationLevelFilter } from '@/shared/api/data/educationData'
import type { CountyComparisonSummary, CountySummary, DashboardFilters, EducationDistributionRow, RankingSummary, ScopeSummary } from '@/shared/lib/analytics/analytics.types'
import { aggregateSchools, aggregateSummarySeries, getFilteredSchoolsForTownship, getSummaryTrend, matchesSummarySearch } from '@/shared/lib/analytics/analytics.helpers'

export function getCountySummaries(counties: CountySummaryRecord[], filters: DashboardFilters): CountySummary[] {
  return counties.map((county) => {
    const inRegion = filters.region === '全部' || county.region === filters.region
    const inSearch = matchesSummarySearch(county, filters)
    const metrics = inRegion && inSearch ? aggregateSummarySeries(getSummaryTrend(county.summaries, filters), filters.year) : {
      students: 0,
      schools: 0,
      delta: 0,
      deltaRatio: 0,
      trend: ACADEMIC_YEARS.map((year) => ({ year, value: 0 })),
    }

    return { id: county.id, name: county.name, shortLabel: county.shortLabel, region: county.region, ...metrics, filteredOut: !(inRegion && inSearch) }
  })
}

export function getCountyScopeSummary(county: CountyRecord, filters: DashboardFilters): ScopeSummary {
  const metrics = aggregateSchools(
    county.towns.flatMap((township) => getFilteredSchoolsForTownship(township, county, filters)),
    filters.year,
  )
  return { label: county.name, caption: '縣市層級學生與學校概況', ...metrics }
}

export function getCountyScopeSummaryFromSummary(county: CountySummaryRecord, filters: DashboardFilters): ScopeSummary {
  const metrics = aggregateSummarySeries(getSummaryTrend(county.summaries, filters), filters.year)
  return { label: county.name, caption: '縣市層級學生與學校概況', ...metrics }
}

export function getCountyNotesFromSummary(county: CountySummaryRecord) {
  return county.dataNotes ?? []
}

export function getCountyEducationDistribution(county: CountySummaryRecord, filters: Pick<DashboardFilters, 'managementType' | 'year'>): EducationDistributionRow[] {
  const levels: Array<Exclude<EducationLevelFilter, '全部'>> = ['國小', '國中', '高中職', '大專院校']
  const rows = levels.map((level) => {
    const metrics = aggregateSummarySeries(county.summaries[buildSummaryBucketKey(level, filters.managementType)] ?? county.summaries[buildSummaryBucketKey(level, '全部')] ?? [], filters.year)
    return { level, students: metrics.students, schools: metrics.schools, share: 0 }
  })
  const totalStudents = rows.reduce((sum, row) => sum + row.students, 0)
  return rows.map((row) => ({ ...row, share: totalStudents === 0 ? 0 : row.students / totalStudents }))
}

export function getCountyComparisonSummaries(counties: CountySummaryRecord[], countyIds: string[], filters: DashboardFilters): CountyComparisonSummary[] {
  return countyIds
    .map((countyId) => counties.find((county) => county.id === countyId) ?? null)
    .filter((county): county is CountySummaryRecord => Boolean(county))
    .map((county) => {
      const metrics = aggregateSummarySeries(getSummaryTrend(county.summaries, filters), filters.year)
      return { id: county.id, name: county.name, shortLabel: county.shortLabel, region: county.region, ...metrics, distribution: getCountyEducationDistribution(county, filters) }
    })
}

export function getCountyStructureDistribution(county: CountySummaryRecord, year: AcademicYear) {
  const levels: Array<Exclude<EducationLevelFilter, '全部'>> = ['國小', '國中', '高中職', '大專院校']
  return levels.map(level => {
    const pub = aggregateSummarySeries(county.summaries[buildSummaryBucketKey(level, '公立')] ?? [], year)
    const priv = aggregateSummarySeries(county.summaries[buildSummaryBucketKey(level, '私立')] ?? [], year)
    return {
      level,
      publicStudents: pub.students,
      privateStudents: priv.students,
      publicSchools: pub.schools,
      privateSchools: priv.schools,
    }
  })
}

export function getCountyRankingRows(countySummaries: CountySummary[]): RankingSummary[] {
  return countySummaries.filter((county) => !county.filteredOut).sort((left, right) => right.students - left.students).map((county) => ({ id: county.id, label: county.name, subLabel: county.region, students: county.students, schools: county.schools, delta: county.delta, deltaRatio: county.deltaRatio, trend: county.trend }))
}
