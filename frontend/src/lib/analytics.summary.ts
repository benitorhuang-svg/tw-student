import { ACADEMIC_YEARS, buildSummaryBucketKey, type CountyRecord, type CountySummaryRecord, type EducationLevelFilter, type ManagementTypeFilter, type RegionGroup } from '../data/educationData'
import type {
  CountyComparisonSummary,
  CountySummary,
  DashboardFilters,
  EducationDistributionRow,
  RankingSummary,
  ScopeSummary,
} from './analytics.types'
import { aggregateSchools, aggregateSummarySeries, getFilteredSchoolsForTownship, getSummaryTrend, matchesSummarySearch } from './analytics.helpers'

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

export function getNationSummary(counties: CountySummaryRecord[], filters: DashboardFilters): ScopeSummary {
  const countySummaries = getCountySummaries(counties, filters).filter((county) => !county.filteredOut)
  const students = countySummaries.reduce((sum, county) => sum + county.students, 0)
  const schools = countySummaries.reduce((sum, county) => sum + county.schools, 0)
  const delta = countySummaries.reduce((sum, county) => sum + county.delta, 0)
  const previousStudents = students - delta

  return {
    label: filters.region === '全部' ? '全台灣' : `${filters.region}總覽`,
    caption: '全台學生分布與趨勢總覽',
    students,
    schools,
    delta,
    deltaRatio: previousStudents === 0 ? 0 : delta / previousStudents,
    trend: ACADEMIC_YEARS.map((year) => ({ year, value: countySummaries.reduce((sum, county) => sum + (county.trend.find((point) => point.year === year)?.value ?? 0), 0) })),
  }
}

export function getTownshipSummaries(county: CountySummaryRecord, filters: DashboardFilters): RankingSummary[] {
  return county.towns
    .map((township) => {
      const searchText = filters.searchText.trim()
      const matchesSearch = !searchText || /^\d{4,}$/.test(searchText) || [county.name, township.name].some((value) => value.toLocaleLowerCase().includes(searchText.toLocaleLowerCase()))
      const metrics = matchesSearch ? aggregateSummarySeries(getSummaryTrend(township.summaries, filters), filters.year) : {
        students: 0,
        schools: 0,
        delta: 0,
        deltaRatio: 0,
        trend: ACADEMIC_YEARS.map((year) => ({ year, value: 0 })),
      }

      return { id: township.id, label: township.name, subLabel: `${county.name}轄區`, ...metrics }
    })
    .filter((township) => township.students > 0 || township.schools > 0)
    .sort((left, right) => right.students - left.students)
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

export function getTownshipScopeSummaryFromSummary(county: CountySummaryRecord, townshipId: string, filters: DashboardFilters): ScopeSummary | null {
  const township = county.towns.find((item) => item.id === townshipId)
  if (!township) return null
  const metrics = aggregateSummarySeries(getSummaryTrend(township.summaries, filters), filters.year)
  return { label: township.name, caption: `${county.name}內的鄉鎮層級洞察`, ...metrics }
}

export function getTownshipNotesFromSummary(county: CountySummaryRecord, townshipId: string) {
  return county.towns.find((item) => item.id === townshipId)?.dataNotes ?? []
}

export function getCountyNotesFromSummary(county: CountySummaryRecord) {
  return county.dataNotes ?? []
}

export function getNationalEducationDistribution(counties: CountySummaryRecord[], filters: DashboardFilters): EducationDistributionRow[] {
  const levels: Array<Exclude<EducationLevelFilter, '全部'>> = ['國小', '國中', '高中職', '大專院校']
  const rows = levels.map((level) => {
    const sums = getCountySummaries(counties, { ...filters, educationLevel: level }).filter((county) => !county.filteredOut)
    return { level, students: sums.reduce((sum, county) => sum + county.students, 0), schools: sums.reduce((sum, county) => sum + county.schools, 0), share: 0 }
  })
  const total = rows.reduce((sum, row) => sum + row.students, 0)
  return rows.map((row) => ({ ...row, share: total === 0 ? 0 : row.students / total }))
}

export function getNationalEducationTrendSeries(
  counties: CountySummaryRecord[],
  filters: Pick<DashboardFilters, 'year' | 'managementType' | 'region' | 'searchText'>,
) {
  const levels: Array<Exclude<EducationLevelFilter, '全部'>> = ['國小', '國中', '高中職', '大專院校']

  return levels.map((level) => {
    const countySummaries = getCountySummaries(counties, { ...filters, educationLevel: level }).filter((county) => !county.filteredOut)
    return {
      label: level,
      points: ACADEMIC_YEARS.map((year) => ({
        year,
        value: countySummaries.reduce((sum, county) => sum + (county.trend.find((point) => point.year === year)?.value ?? 0), 0),
      })),
    }
  })
}

export function getRegionalComparisonRows(
  counties: CountySummaryRecord[],
  filters: Pick<DashboardFilters, 'year' | 'educationLevel' | 'searchText'>,
) {
  const allRegionCounties = getCountySummaries(counties, {
    ...filters,
    managementType: '全部' as ManagementTypeFilter,
    region: '全部',
  }).filter((county) => !county.filteredOut)
  const publicCounties = getCountySummaries(counties, {
    ...filters,
    managementType: '公立',
    region: '全部',
  }).filter((county) => !county.filteredOut)
  const privateCounties = getCountySummaries(counties, {
    ...filters,
    managementType: '私立',
    region: '全部',
  }).filter((county) => !county.filteredOut)
  const regions: RegionGroup[] = ['北部', '中部', '南部', '東部', '離島']

  return regions.map((region) => {
    const regionalCounties = allRegionCounties.filter((county) => county.region === region)
    const students = regionalCounties.reduce((sum, county) => sum + county.students, 0)
    const schools = regionalCounties.reduce((sum, county) => sum + county.schools, 0)
    const delta = regionalCounties.reduce((sum, county) => sum + county.delta, 0)
    const previousStudents = students - delta
    const publicStudents = publicCounties.filter((county) => county.region === region).reduce((sum, county) => sum + county.students, 0)
    const privateStudents = privateCounties.filter((county) => county.region === region).reduce((sum, county) => sum + county.students, 0)
    const totalManagedStudents = publicStudents + privateStudents

    return {
      id: region,
      label: region,
      countyCount: regionalCounties.length,
      students,
      schools,
      delta,
      deltaRatio: previousStudents === 0 ? 0 : delta / previousStudents,
      publicStudents,
      privateStudents,
      publicShare: totalManagedStudents === 0 ? 0 : publicStudents / totalManagedStudents,
      privateShare: totalManagedStudents === 0 ? 0 : privateStudents / totalManagedStudents,
    }
  }).filter((row) => row.countyCount > 0)
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

export function getCountyRankingRows(countySummaries: CountySummary[]): RankingSummary[] {
  return countySummaries.filter((county) => !county.filteredOut).sort((left, right) => right.students - left.students).map((county) => ({ id: county.id, label: county.name, subLabel: county.region, students: county.students, schools: county.schools, delta: county.delta, deltaRatio: county.deltaRatio, trend: county.trend }))
}