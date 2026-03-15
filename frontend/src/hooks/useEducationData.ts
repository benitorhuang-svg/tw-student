import { useAtlasBootstrap } from './data/useAtlasBootstrap'
import { useCountyResources } from './data/useCountyResources'
import { useDataSync } from './data/useDataSync'

export function useEducationData(selectedCountyId: string | null) {
  // 1. Core bootstrap data
  const bootstrap = useAtlasBootstrap()

  // 2. County-specific slice cache
  const resources = useCountyResources(bootstrap.summaryDataset, selectedCountyId)

  // 3. Sync & Update logic
  const sync = useDataSync({
    summaryDataset: bootstrap.summaryDataset,
    countyBoundaries: bootstrap.countyBoundaries,
    localManifest: bootstrap.localManifest,
    validationReport: bootstrap.validationReport,
    selectedCountyId,
    setSummaryDataset: bootstrap.setSummaryDataset,
    setCountyBoundaries: bootstrap.setCountyBoundaries,
    setLocalManifest: bootstrap.setLocalManifest,
    setValidationReport: bootstrap.setValidationReport,
    setCountyDetailCache: resources.setCountyDetailCache,
    setCountyBucketCache: resources.setCountyBucketCache,
    setCountySchoolAtlasCache: resources.setCountySchoolAtlasCache,
    setTownshipBoundaryCache: resources.setTownshipBoundaryCache,
    setCountyDetailError: resources.setCountyDetailError,
    setCountySchoolAtlasError: resources.setCountySchoolAtlasError,
  })

  const prefetchAllCounties = () => {
    if (!bootstrap.summaryDataset) return
    bootstrap.summaryDataset.counties.forEach((county) => {
      resources.prefetchCounty(county.id)
    })
  }

  const clearCountyDetailError = () => resources.setCountyDetailError(null)

  return {
    ...bootstrap,
    ...resources,
    ...sync,
    clearCountyDetailError,
    prefetchAllCounties,
  }
}
