import {
  ACADEMIC_YEARS,
  type AcademicYear,
  buildSummaryBucketKey,
  type CountyDetailDataset,
  type CountyRecord,
  type CountySummaryRecord,
  type DataNote,
  type EducationLevelFilter,
  type ManagementTypeFilter,
  type RegionGroupFilter,
  type SchoolRecord,
  type SummaryTrendRecord,
  type TownshipRecord,
} from '../data/educationData'

export type DashboardFilters = {
  year: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  searchText: string
}

export type TrendPoint = {
  year: AcademicYear
  value: number
}

export type CountySummary = {
  id: string
  name: string
  shortLabel: string
  region: Exclude<RegionGroupFilter, '全部'>
  students: number
  schools: number
  delta: number
  deltaRatio: number
  trend: TrendPoint[]
  filteredOut: boolean
}

export type RankingSummary = {
  id: string
  label: string
  subLabel: string
  students: number
  schools: number
  delta: number
  deltaRatio: number
  trend: TrendPoint[]
}

export type ScopeSummary = {
  label: string
  caption: string
  students: number
  schools: number
  delta: number
  deltaRatio: number
  trend: TrendPoint[]
}

export type EducationDistributionRow = {
  level: Exclude<EducationLevelFilter, '全部'>
  students: number
  schools: number
  share: number
}

export type CountyComparisonSummary = {
  id: string
  name: string
  shortLabel: string
  region: Exclude<RegionGroupFilter, '全部'>
  students: number
  schools: number
  delta: number
  deltaRatio: number
  trend: TrendPoint[]
  distribution: EducationDistributionRow[]
}

export type SchoolInsight = {
  id: string
  code: string
  name: string
  countyName: string
  townshipName: string
  educationLevel: SchoolRecord['educationLevel']
  managementType: SchoolRecord['managementType']
  address: string
  phone: string
  website: string
  currentStudents: number
  delta: number
  deltaRatio: number
  trend: TrendPoint[]
  status?: SchoolRecord['status']
  missingYears?: SchoolRecord['missingYears']
  dataNotes?: DataNote[]
}

function previousYearOf(year: AcademicYear) {
  const index = ACADEMIC_YEARS.indexOf(year)
  return index > 0 ? ACADEMIC_YEARS[index - 1] : null
}

function getStudentsForYear(school: SchoolRecord, year: AcademicYear) {
  return school.yearlyStudents.find((record) => record.year === year)?.students ?? 0
}

function matchesText(haystack: string, searchText: string) {
  return haystack.toLocaleLowerCase().includes(searchText.toLocaleLowerCase())
}

function matchesSchoolFilters(
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
  return [school.name, countyName, townshipName].some((value) => matchesText(value, searchText))
}

function aggregateSchools(schools: SchoolRecord[], year: AcademicYear) {
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
    })),
  }
}

function aggregateSummarySeries(summaryTrend: SummaryTrendRecord[], year: AcademicYear) {
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

function getSummaryTrend(
  summaries: Record<string, SummaryTrendRecord[]>,
  filters: Pick<DashboardFilters, 'educationLevel' | 'managementType'>,
) {
  return (
    summaries[buildSummaryBucketKey(filters.educationLevel, filters.managementType)] ??
    summaries[buildSummaryBucketKey('全部', '全部')] ??
    []
  )
}

function matchesSummarySearch(county: CountySummaryRecord, filters: Pick<DashboardFilters, 'searchText'>) {
  const searchText = filters.searchText.trim()

  if (!searchText) {
    return true
  }

  return [county.name, ...county.towns.map((town) => town.name)].some((value) => matchesText(value, searchText))
}

function getFilteredSchoolsForTownship(township: TownshipRecord, county: CountyRecord, filters: DashboardFilters) {
  return township.schools.filter((school) => matchesSchoolFilters(school, filters, county.name, township.name))
}

export function formatStudents(value: number) {
  return value.toLocaleString('zh-TW')
}

export function formatDelta(delta: number) {
  const prefix = delta > 0 ? '+' : ''
  return `${prefix}${delta.toLocaleString('zh-TW')}`
}

export function formatPercent(deltaRatio: number) {
  const prefix = deltaRatio > 0 ? '+' : ''
  return `${prefix}${(deltaRatio * 100).toFixed(1)}%`
}

export function formatAcademicYear(year: AcademicYear) {
  return `${year} 學年`
}

export function formatFileSize(bytes: number) {
  if (bytes <= 0) {
    return '0 B'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

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

    return {
      id: county.id,
      name: county.name,
      shortLabel: county.shortLabel,
      region: county.region,
      students: metrics.students,
      schools: metrics.schools,
      delta: metrics.delta,
      deltaRatio: metrics.deltaRatio,
      trend: metrics.trend,
      filteredOut: !(inRegion && inSearch),
    }
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
    trend: ACADEMIC_YEARS.map((year) => ({
      year,
      value: countySummaries.reduce(
        (sum, county) => sum + (county.trend.find((point) => point.year === year)?.value ?? 0),
        0,
      ),
    })),
  }
}

export function getTownshipSummaries(county: CountySummaryRecord, filters: DashboardFilters): RankingSummary[] {
  return county.towns
    .map((township) => {
      const matchesSearch = !filters.searchText.trim() || [county.name, township.name].some((value) => matchesText(value, filters.searchText.trim()))
      const metrics = matchesSearch ? aggregateSummarySeries(getSummaryTrend(township.summaries, filters), filters.year) : {
        students: 0,
        schools: 0,
        delta: 0,
        deltaRatio: 0,
        trend: ACADEMIC_YEARS.map((year) => ({ year, value: 0 })),
      }

      return {
        id: township.id,
        label: township.name,
        subLabel: `${county.name}轄區`,
        students: metrics.students,
        schools: metrics.schools,
        delta: metrics.delta,
        deltaRatio: metrics.deltaRatio,
        trend: metrics.trend,
      }
    })
    .filter((township) => township.students > 0 || township.schools > 0)
    .sort((left, right) => right.students - left.students)
}

export function getCountyScopeSummary(county: CountyRecord, filters: DashboardFilters): ScopeSummary {
  const metrics = aggregateSchools(
    county.towns.flatMap((township) => getFilteredSchoolsForTownship(township, county, filters)),
    filters.year,
  )

  return {
    label: county.name,
    caption: '縣市層級學生與學校概況',
    students: metrics.students,
    schools: metrics.schools,
    delta: metrics.delta,
    deltaRatio: metrics.deltaRatio,
    trend: metrics.trend,
  }
}

export function getCountyScopeSummaryFromSummary(county: CountySummaryRecord, filters: DashboardFilters): ScopeSummary {
  const metrics = aggregateSummarySeries(getSummaryTrend(county.summaries, filters), filters.year)

  return {
    label: county.name,
    caption: '縣市層級學生與學校概況',
    students: metrics.students,
    schools: metrics.schools,
    delta: metrics.delta,
    deltaRatio: metrics.deltaRatio,
    trend: metrics.trend,
  }
}

export function getTownshipScopeSummaryFromSummary(
  county: CountySummaryRecord,
  townshipId: string,
  filters: DashboardFilters,
): ScopeSummary | null {
  const township = county.towns.find((item) => item.id === townshipId)

  if (!township) {
    return null
  }

  const metrics = aggregateSummarySeries(getSummaryTrend(township.summaries, filters), filters.year)

  return {
    label: township.name,
    caption: `${county.name}內的鄉鎮層級洞察`,
    students: metrics.students,
    schools: metrics.schools,
    delta: metrics.delta,
    deltaRatio: metrics.deltaRatio,
    trend: metrics.trend,
  }
}

export function getTownshipNotesFromSummary(county: CountySummaryRecord, townshipId: string) {
  return county.towns.find((item) => item.id === townshipId)?.dataNotes ?? []
}

export function getCountyNotesFromSummary(county: CountySummaryRecord) {
  return county.dataNotes ?? []
}

export function getCountyEducationDistribution(
  county: CountySummaryRecord,
  filters: Pick<DashboardFilters, 'managementType' | 'year'>,
): EducationDistributionRow[] {
  const levels: Array<Exclude<EducationLevelFilter, '全部'>> = ['國小', '國中', '高中職', '大專院校']
  const rows = levels.map((level) => {
    const metrics = aggregateSummarySeries(
      county.summaries[buildSummaryBucketKey(level, filters.managementType)] ??
        county.summaries[buildSummaryBucketKey(level, '全部')] ??
        [],
      filters.year,
    )

    return {
      level,
      students: metrics.students,
      schools: metrics.schools,
      share: 0,
    }
  })

  const totalStudents = rows.reduce((sum, row) => sum + row.students, 0)

  return rows.map((row) => ({
    ...row,
    share: totalStudents === 0 ? 0 : row.students / totalStudents,
  }))
}

export function getCountyComparisonSummaries(
  counties: CountySummaryRecord[],
  countyIds: string[],
  filters: DashboardFilters,
): CountyComparisonSummary[] {
  return countyIds
    .map((countyId) => counties.find((county) => county.id === countyId) ?? null)
    .filter((county): county is CountySummaryRecord => Boolean(county))
    .map((county) => {
      const metrics = aggregateSummarySeries(getSummaryTrend(county.summaries, filters), filters.year)

      return {
        id: county.id,
        name: county.name,
        shortLabel: county.shortLabel,
        region: county.region,
        students: metrics.students,
        schools: metrics.schools,
        delta: metrics.delta,
        deltaRatio: metrics.deltaRatio,
        trend: metrics.trend,
        distribution: getCountyEducationDistribution(county, filters),
      }
    })
}

export function getSchoolInsights(
  countyDetail: CountyDetailDataset | null,
  filters: DashboardFilters,
  townshipId: string | null,
): SchoolInsight[] {
  if (!countyDetail) {
    return []
  }

  return countyDetail.towns
    .filter((township) => (townshipId ? township.id === townshipId : true))
    .flatMap((township) =>
      township.schools
        .filter((school) => matchesSchoolFilters(school, filters, countyDetail.county.name, township.name))
        .map((school) => {
          const currentStudents = getStudentsForYear(school, filters.year)
          const previousYear = previousYearOf(filters.year)
          const previousStudents = previousYear ? getStudentsForYear(school, previousYear) : currentStudents
          const delta = currentStudents - previousStudents

          return {
            id: school.id,
            code: school.code,
            name: school.name,
            countyName: countyDetail.county.name,
            townshipName: township.name,
            educationLevel: school.educationLevel,
            managementType: school.managementType,
            address: school.address,
            phone: school.phone,
            website: school.website,
            currentStudents,
            delta,
            deltaRatio: previousStudents === 0 ? 0 : delta / previousStudents,
            trend: school.yearlyStudents.map((record) => ({ year: record.year, value: record.students })),
            status: school.status,
            missingYears: school.missingYears,
            dataNotes: school.dataNotes,
          }
        }),
    )
    .sort((left, right) => right.currentStudents - left.currentStudents)
}

export function getCountyRankingRows(countySummaries: CountySummary[]): RankingSummary[] {
  return countySummaries
    .filter((county) => !county.filteredOut)
    .sort((left, right) => right.students - left.students)
    .map((county) => ({
      id: county.id,
      label: county.name,
      subLabel: county.region,
      students: county.students,
      schools: county.schools,
      delta: county.delta,
      deltaRatio: county.deltaRatio,
      trend: county.trend,
    }))
}