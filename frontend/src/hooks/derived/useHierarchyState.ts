import { useMemo } from 'react'
import type { 
  EducationSummaryDataset, 
  CountyDetailDataset,
  TownshipBoundaryCollection
} from '../../data/educationData'
import { normalizeCountyId, normalizeTownshipId, resolveCountyRecord } from '../atlasIdentity'

export function useHierarchyState(
  summaryDataset: EducationSummaryDataset | null,
  selectedCountyId: string | null,
  selectedTownshipId: string | null,
  townshipBoundaryCache: Record<string, TownshipBoundaryCollection>,
  countyDetailCache: Record<string, CountyDetailDataset>,
) {
  return useMemo(() => {
    if (!summaryDataset) {
      return {
        selectedCountyFromDataset: null,
        activeCountyId: null,
        activeTownshipId: null,
        activeTownshipBoundaries: null,
        isTownshipBoundaryLoading: false,
        selectedCounty: null,
        selectedCountyDetail: null,
      }
    }

    const selectedCountyFromDataset = resolveCountyRecord(summaryDataset, selectedCountyId)
    const activeCountyId = selectedCountyFromDataset ? normalizeCountyId(summaryDataset, selectedCountyId) : null
    
    // Special-case: when focusing on 嘉義, present both 嘉義市 and 嘉義縣 township slices together
    const isChiayiGroup = activeCountyId === '嘉義市' || activeCountyId === '嘉義縣'
    const chiayiCityBoundaries = townshipBoundaryCache['嘉義市'] ?? null
    const chiayiCountyBoundaries = townshipBoundaryCache['嘉義縣'] ?? null
    
    const activeTownshipBoundaries = activeCountyId
      ? isChiayiGroup
        ? (chiayiCityBoundaries && chiayiCountyBoundaries
          ? { type: 'FeatureCollection' as const, features: [...chiayiCityBoundaries.features, ...chiayiCountyBoundaries.features] }
          : (chiayiCityBoundaries ?? chiayiCountyBoundaries ?? null))
        : (townshipBoundaryCache[activeCountyId] ?? null)
      : null

    const isTownshipBoundaryLoading = Boolean(
      activeCountyId && (
        isChiayiGroup
          ? !(chiayiCityBoundaries && chiayiCountyBoundaries)
          : !(townshipBoundaryCache[activeCountyId])
      ),
    )

    const activeTownshipId = activeCountyId ? normalizeTownshipId(summaryDataset, activeCountyId, selectedTownshipId) : null
    const selectedCounty = summaryDataset.counties.find((county) => county.id === activeCountyId) ?? null
    const selectedCountyDetail = activeCountyId ? countyDetailCache[activeCountyId] ?? null : null

    const allTownshipBoundaries = (() => {
      const features = Object.values(townshipBoundaryCache).flatMap(coll => coll.features)
      if (features.length === 0) return null
      return { type: 'FeatureCollection' as const, features }
    })()

    return {
      selectedCountyFromDataset,
      activeCountyId,
      activeTownshipId,
      activeTownshipBoundaries,
      allTownshipBoundaries,
      isTownshipBoundaryLoading,
      selectedCounty,
      selectedCountyDetail,
    }
  }, [summaryDataset, selectedCountyId, selectedTownshipId, townshipBoundaryCache, countyDetailCache])
}
