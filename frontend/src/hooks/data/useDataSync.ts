import { useState } from 'react'
import {
  diffManifestAssets,
  loadDataManifest,
  refreshEducationSummary,
  resetAtlasBoundaryCaches,
  resetAtlasLoadObservations,
  resetAtlasSqliteCache,
  type DataManifest,
  type DataRefreshSummary,
  type EducationSummaryDataset,
  type CountyDetailDataset,
  type CountyBucketDataset,
  type CountySchoolAtlasDataset,
  type TownshipBoundaryCollection,
  type CountyBoundaryCollection,
  type ValidationReport,
  loadCountyBoundaries,
  loadValidationReport,
} from '../../data/educationData'

type SyncDeps = {
  summaryDataset: EducationSummaryDataset | null
  countyBoundaries: CountyBoundaryCollection | null
  localManifest: DataManifest | null
  validationReport: ValidationReport | null
  selectedCountyId: string | null
  setSummaryDataset: (d: EducationSummaryDataset | null) => void
  setCountyBoundaries: (b: CountyBoundaryCollection | null) => void
  setLocalManifest: (m: DataManifest | null) => void
  setValidationReport: (v: ValidationReport | null) => void
  setCountyDetailCache: (c: Record<string, CountyDetailDataset>) => void
  setCountyBucketCache: (c: Record<string, CountyBucketDataset>) => void
  setCountySchoolAtlasCache: (c: Record<string, CountySchoolAtlasDataset>) => void
  setTownshipBoundaryCache: (c: Record<string, TownshipBoundaryCollection>) => void
  setCountyDetailError: (e: string | null) => void
  setCountySchoolAtlasError: (e: string | null) => void
}

export function useDataSync(deps: SyncDeps) {
  const [remoteManifest, setRemoteManifest] = useState<DataManifest | null>(null)
  const [refreshSummary, setRefreshSummary] = useState<DataRefreshSummary | null>(null)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null)

  const refreshData = async () => {
    setIsRefreshingData(true)
    setRefreshStatus('比對部署 manifest 與本地版本...')

    try {
      const nextRemoteManifest = await loadDataManifest({ forceRefresh: true })
      setRemoteManifest(nextRemoteManifest)

      if (deps.localManifest?.contentHash === nextRemoteManifest.contentHash) {
        const nextRefreshSummary: DataRefreshSummary = {
          checkedAt: new Date().toISOString(),
          overallStatus: 'up-to-date',
          localGeneratedAt: deps.localManifest.generatedAt,
          remoteGeneratedAt: nextRemoteManifest.generatedAt,
          localContentHash: deps.localManifest.contentHash,
          remoteContentHash: nextRemoteManifest.contentHash,
          schemaVersion: nextRemoteManifest.schemaVersion,
          updatedAssets: [],
          skippedAssets: nextRemoteManifest.assets.map((asset) => asset.path),
          failedAssets: [],
          rolledBackAssets: [],
          message: '部署資料沒有變更，沿用目前快取。',
        }
        setRefreshSummary(nextRefreshSummary)
        setRefreshStatus(nextRefreshSummary.message)
        return
      }

      const { changedAssets } = diffManifestAssets(deps.localManifest, nextRemoteManifest)
      const changedPaths = new Set(changedAssets.map((asset) => asset.path))
      const updatedAssets: string[] = []

      let nextSummaryDataset = deps.summaryDataset
      let nextCountyBoundaries = deps.countyBoundaries
      let nextValidationReport = deps.validationReport

      const sqliteChanged = changedPaths.has('education-atlas.sqlite') || changedPaths.has('education-summary.json')
      const countyBoundariesChanged = changedPaths.has('county-boundaries.topo.json')
      const validationChanged = changedPaths.has('validation-report.json')

      if (sqliteChanged) {
        try {
          resetAtlasSqliteCache()
          resetAtlasLoadObservations()
          nextSummaryDataset = await refreshEducationSummary()
          deps.setCountyDetailCache({})
          deps.setCountyBucketCache({})
          updatedAssets.push(...changedAssets.filter((asset) => asset.path === 'education-atlas.sqlite' || asset.path === 'education-summary.json').map((asset) => asset.path))
        } catch (error) {
            /* Error handling */
        }
      }

      if (countyBoundariesChanged) {
        try {
          resetAtlasBoundaryCaches()
          nextCountyBoundaries = await loadCountyBoundaries({ forceRefresh: true })
          updatedAssets.push('county-boundaries.topo.json')
        } catch (error) { /* ... */ }
      }

      if (validationChanged || !deps.validationReport) {
        try {
          nextValidationReport = await loadValidationReport({ forceRefresh: true })
          if (changedPaths.has('validation-report.json')) updatedAssets.push('validation-report.json')
        } catch (error) { /* ... */ }
      }

      deps.setSummaryDataset(nextSummaryDataset)
      deps.setCountyBoundaries(nextCountyBoundaries)
      deps.setValidationReport(nextValidationReport)

      const nextRefreshSummary: DataRefreshSummary = {
        checkedAt: new Date().toISOString(),
        overallStatus: 'updated',
        localGeneratedAt: deps.localManifest?.generatedAt ?? '',
        remoteGeneratedAt: nextRemoteManifest.generatedAt,
        localContentHash: deps.localManifest?.contentHash ?? '',
        remoteContentHash: nextRemoteManifest.contentHash,
        schemaVersion: nextRemoteManifest.schemaVersion,
        updatedAssets,
        skippedAssets: [],
        failedAssets: [],
        rolledBackAssets: [],
        message: '資料同步完成',
      }
      setRefreshSummary(nextRefreshSummary)
      setRefreshStatus('資料同步完成')
    } catch (e) {
      setRefreshStatus('同步失敗')
    } finally {
      setIsRefreshingData(false)
    }
  }

  return {
    remoteManifest,
    refreshSummary,
    isRefreshingData,
    refreshStatus,
    refreshData,
  }
}
