import { useMemo } from 'react'
import type { 
  EducationSummaryDataset, 
  CountySummaryRecord,
  AcademicYear,
  EducationLevelFilter,
  ManagementTypeFilter,
  RegionGroupFilter
} from '../../data/educationData'
import {
  getCountyComparisonSummaries,
  getCountyRankingRows,
  getCountyScopeSummaryFromSummary,
  getCountySummaries,
  getNationalEducationDistribution,
  getNationalEducationTrendSeries,
  getRegionalComparisonRows,
  getNationSummary,
  getTownshipScopeSummaryFromSummary,
  getTownshipSummaries,
} from '../../lib/analytics'
import { normalizeCountyIds, toCanonicalCountyIds } from '../atlasIdentity'

export function useAnalyticsState(
  summaryDataset: EducationSummaryDataset | null,
  filters: {
    year: AcademicYear
    educationLevel: EducationLevelFilter
    managementType: ManagementTypeFilter
    region: RegionGroupFilter
    searchText: string
  },
  selectedCounty: CountySummaryRecord | null,
  activeTownshipId: string | null,
  comparisonCountyIds: string[],
  comparisonScenarioName: string,
) {
  return useMemo(() => {
    if (!summaryDataset) {
      return {
        countySummaries: [],
        mapCountySummaries: [],
        countyRankingRows: [],
        selectedCountySummary: null,
        townshipRows: [],
        allTownshipRows: [],
        selectedTownshipSummary: null,
        nationalSummary: null,
        educationDistribution: [],
        nationalEducationTrendSeries: [],
        regionalComparisonRows: [],
        effectiveComparisonCountyIds: [],
        comparisonSummaries: [],
        comparisonCandidates: [],
        activeScenarioSnapshot: null,
      }
    }

    // keep a copy of the raw summaries for the map layer (no chiayi merge)
    const mapCountySummaries = getCountySummaries(summaryDataset.counties, filters)
    let countySummaries = mapCountySummaries.slice()

    // Chiayi merge logic
    const chiayiRows = countySummaries.filter((c) => c.id === '嘉義市' || c.id === '嘉義縣')
    if (chiayiRows.length === 2) {
      const merged: typeof chiayiRows[0] = {
        id: '嘉義',
        name: '嘉義',
        shortLabel: '嘉義',
        region: chiayiRows[0].region,
        students: chiayiRows[0].students + chiayiRows[1].students,
        schools: chiayiRows[0].schools + chiayiRows[1].schools,
        delta: chiayiRows[0].delta + chiayiRows[1].delta,
        deltaRatio: (chiayiRows[0].students + chiayiRows[1].students - chiayiRows[0].delta - chiayiRows[1].delta) > 0
          ? (chiayiRows[0].delta + chiayiRows[1].delta) / (chiayiRows[0].students + chiayiRows[1].students - chiayiRows[0].delta - chiayiRows[1].delta)
          : 0,
        trend: chiayiRows[0].trend.map((pt, idx) => ({
          year: pt.year,
          value: pt.value + (chiayiRows[1].trend[idx]?.value ?? 0),
        })),
        filteredOut: chiayiRows[0].filteredOut && chiayiRows[1].filteredOut,
      }
      countySummaries = countySummaries.filter((c) => c.id !== '嘉義市' && c.id !== '嘉義縣')
      countySummaries.push(merged)
    }

    const countyRankingRows = getCountyRankingRows(countySummaries)
    const selectedCountySummary = selectedCounty ? getCountyScopeSummaryFromSummary(selectedCounty, filters) : null
    const townshipRows = selectedCounty ? getTownshipSummaries(selectedCounty, filters) : []
    const allTownshipRows = summaryDataset.counties.flatMap((county) => getTownshipSummaries(county, filters))
    
    const selectedTownshipSummary = selectedCounty && activeTownshipId
      ? getTownshipScopeSummaryFromSummary(selectedCounty, activeTownshipId, filters)
      : null

    const nationalSummary = getNationSummary(summaryDataset.counties, filters)
    const educationDistribution = getNationalEducationDistribution(summaryDataset.counties, filters)
    const nationalEducationTrendSeries = getNationalEducationTrendSeries(summaryDataset.counties, filters)
    const regionalComparisonRows = getRegionalComparisonRows(summaryDataset.counties, filters)

    const validComparisonIds = normalizeCountyIds(summaryDataset, comparisonCountyIds)
    const effectiveComparisonCountyIds = (validComparisonIds.length > 0 ? validComparisonIds : countyRankingRows.map((row) => row.id).slice(0, 4)).slice(0, 4)
    const comparisonSummaries = getCountyComparisonSummaries(summaryDataset.counties, effectiveComparisonCountyIds, filters)
    const comparisonCandidateIds = [...new Set([...effectiveComparisonCountyIds, ...countyRankingRows.slice(0, 8).map((row) => row.id)])]
    const comparisonCandidates = comparisonCandidateIds
      .map((countyId) => {
        const rankingRow = countyRankingRows.find((row) => row.id === countyId)
        const summaryRow = countySummaries.find((row) => row.id === countyId)
        return { id: countyId, displayName: summaryRow?.name ?? rankingRow?.label ?? countyId }
      })
      .filter((row) => row.displayName !== row.id || summaryDataset.counties.some((county) => county.id === row.id))

    const activeScenarioSnapshot = comparisonCountyIds.length > 0
      ? {
          name: comparisonScenarioName.trim() || `比較 ${comparisonCountyIds.length} 縣市`,
          countyIds: toCanonicalCountyIds(summaryDataset, comparisonCountyIds).slice(0, 4),
          activeYear: filters.year,
          educationLevel: filters.educationLevel,
          managementType: filters.managementType,
        }
      : null

    return {
      countySummaries,
      mapCountySummaries,
      countyRankingRows,
      selectedCountySummary,
      townshipRows,
      allTownshipRows,
      selectedTownshipSummary,
      nationalSummary,
      educationDistribution,
      nationalEducationTrendSeries,
      regionalComparisonRows,
      effectiveComparisonCountyIds,
      comparisonSummaries,
      comparisonCandidates,
      activeScenarioSnapshot,
    }
  }, [summaryDataset, filters, selectedCounty, activeTownshipId, comparisonCountyIds, comparisonScenarioName])
}
