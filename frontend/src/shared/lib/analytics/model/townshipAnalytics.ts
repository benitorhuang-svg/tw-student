import { ACADEMIC_YEARS, type CountySummaryRecord } from '@/shared/api/data/educationData'
import type { DashboardFilters, RankingSummary, ScopeSummary } from '@/shared/lib/analytics/analytics.types'
import { aggregateSummarySeries, getSummaryTrend } from '@/shared/lib/analytics/analytics.helpers'

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

export function getTownshipScopeSummaryFromSummary(county: CountySummaryRecord, townshipId: string, filters: DashboardFilters): ScopeSummary | null {
  const township = county.towns.find((item) => item.id === townshipId)
  if (!township) return null
  const metrics = aggregateSummarySeries(getSummaryTrend(township.summaries, filters), filters.year)
  return { label: township.name, caption: `${county.name}內的鄉鎮層級洞察`, ...metrics }
}

export function getTownshipNotesFromSummary(county: CountySummaryRecord, townshipId: string) {
  return county.towns.find((item) => item.id === townshipId)?.dataNotes ?? []
}
