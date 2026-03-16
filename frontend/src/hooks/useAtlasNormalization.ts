import { useEffect } from 'react'
import { normalizeCountyId, normalizeCountyIds, normalizeTownshipId } from './atlasIdentity'
import type { EducationSummaryDataset } from '../data/educationData'

type NormalizationArgs = {
  summaryDataset: EducationSummaryDataset | null
  selectedCountyId: string | null
  selectedTownshipId: string | null
  comparisonCountyIds: string[]
  setSelectedCountyId: (id: string | null) => void
  setSelectedTownshipId: (id: string | null) => void
  setComparisonCountyIds: (ids: string[]) => void
}

/**
 * Atom Hook: Normalizes ID state based on available dataset.
 * Prevents "Ghost States" where an ID exists in URL but not in the currently loaded data.
 */
export function useAtlasNormalization({
  summaryDataset,
  selectedCountyId,
  selectedTownshipId,
  comparisonCountyIds,
  setSelectedCountyId,
  setSelectedTownshipId,
  setComparisonCountyIds,
}: NormalizationArgs) {
  useEffect(() => {
    if (!summaryDataset) return

    const normalizedCountyId = normalizeCountyId(summaryDataset, selectedCountyId)
    const normalizedTownshipId = normalizedCountyId 
      ? normalizeTownshipId(summaryDataset, normalizedCountyId, selectedTownshipId) 
      : null
    
    const normalizedComparisonIds = normalizeCountyIds(summaryDataset, comparisonCountyIds).slice(0, 4)
    
    if (selectedCountyId !== normalizedCountyId) {
      setSelectedCountyId(normalizedCountyId)
    }
    if (selectedTownshipId !== normalizedTownshipId) {
      setSelectedTownshipId(normalizedTownshipId)
    }
    
    const comparisonIdsChanged = 
      normalizedComparisonIds.length !== comparisonCountyIds.length || 
      normalizedComparisonIds.some((id, i) => id !== comparisonCountyIds[i])
      
    if (comparisonIdsChanged) {
      setComparisonCountyIds(normalizedComparisonIds)
    }
  }, [
    summaryDataset, 
    selectedCountyId, 
    selectedTownshipId, 
    comparisonCountyIds, 
    setComparisonCountyIds, 
    setSelectedCountyId, 
    setSelectedTownshipId
  ])
}
