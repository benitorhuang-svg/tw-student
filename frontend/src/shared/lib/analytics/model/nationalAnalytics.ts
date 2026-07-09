import { ACADEMIC_YEARS, type CountySummaryRecord, type EducationLevelFilter, type ManagementTypeFilter, type RegionGroup } from '@/shared/api/data/educationData'
import type { DashboardFilters, EducationDistributionRow, RegionalComparisonRow, ScopeSummary } from '@/shared/lib/analytics/analytics.types'
import { getCountySummaries } from './countyAnalytics'

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
): RegionalComparisonRow[] {
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
      trend: ACADEMIC_YEARS.map((year) => ({
        year,
        value: regionalCounties.reduce((sum, county) => sum + (county.trend.find((p) => p.year === year)?.value ?? 0), 0)
      }))
    }
  }).filter((row) => row.countyCount > 0)
}
