import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!deps.localManifest) {
      return
    }

    setRemoteManifest((current) => current ?? deps.localManifest)

    let cancelled = false

    loadDataManifest({ forceRefresh: true })
      .then((nextRemoteManifest) => {
        if (!cancelled) {
          setRemoteManifest(nextRemoteManifest)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteManifest((current) => current ?? deps.localManifest)
        }
      })

    return () => {
      cancelled = true
    }
  }, [deps.localManifest])

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
        deps.setLocalManifest(nextRemoteManifest)
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

      // 全部整併到 SQLite 之後，只要資料庫有變，就全部更新
      const sqliteChanged = changedPaths.has('education-atlas.sqlite')

      if (sqliteChanged || !deps.summaryDataset || !deps.validationReport) {
        try {
          resetAtlasSqliteCache()
          resetAtlasLoadObservations()
          resetAtlasBoundaryCaches()
          
          setRefreshStatus('正在從 SQLite 更新資料...')
          
          // 全部改從 SQL 讀取
          nextSummaryDataset = await refreshEducationSummary()
          nextCountyBoundaries = await loadCountyBoundaries({ forceRefresh: true })
          nextValidationReport = await loadValidationReport({ forceRefresh: true })
          
          deps.setCountyDetailCache({})
          deps.setCountyBucketCache({})
          
          if (sqliteChanged) updatedAssets.push('education-atlas.sqlite')
        } catch (e) {
            console.error('SQLite 資料同步失敗', e)
        }
      }

      deps.setSummaryDataset(nextSummaryDataset)
      deps.setCountyBoundaries(nextCountyBoundaries)
      deps.setLocalManifest(nextRemoteManifest)
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
    } catch {
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
