import { useMemo } from 'react'
import type { 
  EducationSummaryDataset, 
  AtlasLoadObservationSnapshot 
} from '../../data/educationData'
import type { RankingSummary, ScopeSummary } from '../../lib/analytics'

type UiMetadataArgs = {
  summaryDataset: EducationSummaryDataset | null
  selectedCountySummary: ScopeSummary | null
  selectedTownshipSummary: ScopeSummary | null
  activeCountyId: string | null
  activeTownshipId: string | null
  countyRankingRows: RankingSummary[]
  townshipRows: RankingSummary[]
  nationalSummary: ScopeSummary
  loadObservation: AtlasLoadObservationSnapshot
  selectedCounty: any // CountySummaryRecord | null
}

export function useUiMetadata(args: UiMetadataArgs) {
  const {
    summaryDataset,
    selectedCountySummary,
    selectedTownshipSummary,
    countyRankingRows,
    townshipRows,
    nationalSummary,
    loadObservation,
    selectedCounty
  } = args

  return useMemo(() => {
    if (!summaryDataset) return null

    const scopePath = ['全台']
    if (selectedCountySummary) scopePath.push(selectedCountySummary.label)
    if (selectedTownshipSummary) scopePath.push(selectedTownshipSummary.label)

    const rankingRows = selectedCounty ? townshipRows : countyRankingRows
    const topRows = rankingRows.slice(0, 6)
    const topCountyPrefetchIds = selectedCounty ? '' : countyRankingRows.slice(0, 3).map((row) => row.id).join('|')
    
    // Use names for headlines/titles from the ScopeSummary labels
    const scopeHeadline = selectedTownshipSummary
      ? `${selectedTownshipSummary.label} 校務分布`
      : selectedCountySummary ? `${selectedCountySummary.label} 教育版圖` : '全台教育工作台'
    
    const scopeDescription = selectedTownshipSummary
      ? '已切到鄉鎮層級，左側表格與異常面板同步聚焦同一範圍。'
      : selectedCountySummary
        ? '已聚焦指定縣市，右側地圖呈現鄉鎮界線與校點分群，左側同步顯示比較與學校明細。'
        : '上方篩選列負責切片條件，左側分析工作台負責比較、排行與治理，右側專注地圖探索。'

    const schoolPanelTitle = selectedTownshipSummary
      ? `${selectedTownshipSummary.label} 學校清單`
      : selectedCountySummary ? `${selectedCountySummary.label} 重點學校` : '縣市細節載入後顯示學校清單'

    const generatedAtLabel = new Date(summaryDataset.generatedAt).toLocaleString('zh-TW')
    
    const observedCounties = summaryDataset.counties
      .filter((c) => 
        loadObservation.loadedCountyDetails.includes(c.id) || 
        loadObservation.loadedBucketSlices.includes(c.id) || 
        loadObservation.loadedTownshipSlices.includes(c.id)
      )
      .map((c) => ({
        id: c.id,
        name: c.name,
        detailBytes: loadObservation.resourceSizes[c.detailFile] ?? c.assetMetrics?.detailBytes ?? 0,
        bucketBytes: loadObservation.resourceSizes[c.bucketFile] ?? c.assetMetrics?.bucketBytes ?? 0,
        townshipBytes: loadObservation.resourceSizes[c.townshipFile] ?? c.assetMetrics?.townshipBytes ?? 0,
        hasBucketSlice: loadObservation.loadedBucketSlices.includes(c.id),
        hasTownshipSlice: loadObservation.loadedTownshipSlices.includes(c.id),
      }))

    return {
      scopePath,
      rankingRows,
      topRows,
      topCountyPrefetchIds,
      scopeHeadline,
      scopeDescription,
      schoolPanelTitle,
      generatedAtLabel,
      observedCounties,
      currentScope: selectedTownshipSummary ?? selectedCountySummary ?? nationalSummary,
    }
  }, [summaryDataset, selectedCountySummary, selectedTownshipSummary, selectedCounty, townshipRows, countyRankingRows, nationalSummary, loadObservation])
}
