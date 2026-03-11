import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  COORDINATE_WORKFLOW_STATUSES,
  type CoordinateWorkflowEntry,
  type CoordinateWorkflowStatus,
  type DataManifest,
  type DataRefreshSummary,
  type MissingCoordinateEntry,
  type ValidationReport,
} from '../data/educationTypes'

const COORDINATE_WORKFLOW_STORAGE_KEY = 'atlas.coordinate-workflow'

type DataGovernanceFlyoutProps = {
  open: boolean
  onClose: () => void
  generatedAtLabel: string
  refreshStatus: string | null
  isRefreshingData: boolean
  localManifest: DataManifest | null
  remoteManifest: DataManifest | null
  validationReport: ValidationReport | null
  refreshSummary: DataRefreshSummary | null
  sources: {
    points: string
    statistics: string
    townshipBoundaries: string
    countyBoundaries: string
  }
  assetMetrics?: {
    sqliteBytes?: number
    summaryBytes?: number
    countyBoundaryBytes: number
    countyDetailBytes: number
    countyBucketBytes?: number
    townshipBoundaryBytes: number
  }
  anomalyCount: number
  scopeNoteCount: number
  missingCoordinates?: MissingCoordinateEntry[]
  children: ReactNode
}

type CoordinateWorkflowFilter = '全部' | CoordinateWorkflowStatus
type WorkflowRow = MissingCoordinateEntry & { workflowStatus: CoordinateWorkflowStatus; workflowUpdatedAt: string | null }

function readCoordinateWorkflow() {
  if (typeof window === 'undefined') return {} as Record<string, CoordinateWorkflowEntry>

  try {
    const raw = window.localStorage.getItem(COORDINATE_WORKFLOW_STORAGE_KEY)
    if (!raw) return {} as Record<string, CoordinateWorkflowEntry>
    return JSON.parse(raw) as Record<string, CoordinateWorkflowEntry>
  } catch {
    return {} as Record<string, CoordinateWorkflowEntry>
  }
}

function buildMissingCoordinatesCsv(missingCoordinates: WorkflowRow[]) {
  const rows = [
    ['schoolCode', 'name', 'county', 'township', 'level', 'address', 'coordinateResolution', 'longitude', 'latitude', 'coordinateMatchType', 'coordinateMatchScore', 'workflowStatus', 'workflowUpdatedAt'],
    ...missingCoordinates.map((entry) => [
      entry.code,
      entry.name,
      entry.county,
      entry.township,
      entry.level,
      entry.address ?? '',
      entry.coordinateResolution ?? '',
      entry.longitude ?? '',
      entry.latitude ?? '',
      entry.coordinateMatchType ?? '',
      entry.coordinateMatchScore ?? '',
      entry.workflowStatus,
      entry.workflowUpdatedAt ?? '',
    ]),
  ]

  return rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
}

function downloadMissingCoordinates(missingCoordinates: WorkflowRow[]) {
  const blob = new Blob([buildMissingCoordinatesCsv(missingCoordinates)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'missing-coordinates.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function formatBytes(bytes: number | undefined) {
  if (!bytes) {
    return '未提供'
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatVersionLabel(manifest: DataManifest | null) {
  if (!manifest) return '尚未載入'
  return `${new Date(manifest.generatedAt).toLocaleString('zh-TW')} / ${manifest.buildId}`
}

function formatValidationStatus(validationReport: ValidationReport | null) {
  if (!validationReport) return '尚未載入'
  if (validationReport.overallStatus === 'fail') return '阻擋異常'
  if (validationReport.overallStatus === 'warning') return '含警示'
  return '通過'
}

function DataGovernanceFlyout({
  open,
  onClose,
  generatedAtLabel,
  refreshStatus,
  isRefreshingData,
  localManifest,
  remoteManifest,
  validationReport,
  refreshSummary,
  sources,
  assetMetrics,
  anomalyCount,
  scopeNoteCount,
  missingCoordinates = [],
  children,
}: DataGovernanceFlyoutProps) {
  const [workflowByCode, setWorkflowByCode] = useState<Record<string, CoordinateWorkflowEntry>>(() => readCoordinateWorkflow())
  const [workflowFilter, setWorkflowFilter] = useState<CoordinateWorkflowFilter>('全部')

  useEffect(() => {
    window.localStorage.setItem(COORDINATE_WORKFLOW_STORAGE_KEY, JSON.stringify(workflowByCode))
  }, [workflowByCode])

  const workflowRows = useMemo<WorkflowRow[]>(() => missingCoordinates.map((entry) => {
    const workflow = workflowByCode[entry.code]
    return {
      ...entry,
      workflowStatus: workflow?.status ?? 'GIS缺點位',
      workflowUpdatedAt: workflow?.updatedAt ?? null,
    }
  }), [missingCoordinates, workflowByCode])

  const workflowCounts = useMemo(() => {
    const counts: Record<CoordinateWorkflowFilter, number> = { 全部: workflowRows.length, GIS缺點位: 0, 人工補點: 0, 已回填: 0 }
    workflowRows.forEach((entry) => { counts[entry.workflowStatus] += 1 })
    return counts
  }, [workflowRows])

  const filteredWorkflowRows = workflowFilter === '全部'
    ? workflowRows
    : workflowRows.filter((entry) => entry.workflowStatus === workflowFilter)

  const updateWorkflowStatus = (code: string, status: CoordinateWorkflowStatus) => {
    setWorkflowByCode((current) => ({
      ...current,
      [code]: {
        schoolCode: code,
        status,
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  if (!open) {
    return null
  }

  return (
    <div className="governance-flyout-layer" role="dialog" aria-modal="false" aria-label="資料治理面板">
      <button type="button" className="governance-flyout-backdrop" aria-label="關閉資料治理面板" onClick={onClose} />
      <aside className="governance-flyout">
        <div className="governance-flyout__head">
          <div>
            <p className="eyebrow">資料治理</p>
            <h3>資料調查浮動框</h3>
            <p>最新採信來源以教育部統計處公告為主；教育 GIS 保留為校點與空間細節參考，邊界資料採國土測繪中心公開圖資。</p>
          </div>
          <div className="governance-flyout__actions">
            <a href="https://depart.moe.edu.tw/ed4500/News.aspx?n=5A930C32CC6C3818&sms=91B3AAE8C6388B96" target="_blank" rel="noreferrer">
              統計處最新公告
            </a>
            <a href="https://stats.moe.gov.tw/edugissys/" target="_blank" rel="noreferrer">
              教育 GIS 圖表
            </a>
            <button type="button" className="ghost-button" onClick={onClose}>
              關閉
            </button>
          </div>
        </div>
        <div className="governance-flyout__body">
          <div className="school-chart-panel">
            <section className="school-chart-panel__section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">資料狀態</p>
                  <h3>產製與刷新摘要</h3>
                </div>
                <p className="panel-heading__meta">先確認目前載入的是哪一批正式切片，再往下檢查異常與註記。</p>
              </div>
              <div className="school-profile-sidebar__stats">
                <div className="school-profile-metric">
                  <span>最後產製</span>
                  <strong>{generatedAtLabel}</strong>
                  <small>{isRefreshingData ? '目前正在重新載入部署資料' : '目前顯示前端已部署切片'}</small>
                </div>
                <div className="school-profile-metric" data-testid="governance-local-version">
                  <span>本地版本</span>
                  <strong>{formatVersionLabel(localManifest)}</strong>
                  <small>{localManifest ? localManifest.contentHash.slice(0, 18) : '尚未取得 manifest'}</small>
                </div>
                <div className="school-profile-metric" data-testid="governance-remote-version">
                  <span>遠端版本</span>
                  <strong>{formatVersionLabel(remoteManifest)}</strong>
                  <small>{remoteManifest ? remoteManifest.contentHash.slice(0, 18) : '尚未檢查遠端 manifest'}</small>
                </div>
                <div className="school-profile-metric">
                  <span>異常筆數</span>
                  <strong>{anomalyCount.toLocaleString('zh-TW')}</strong>
                  <small>篩選後可下載原始年度序列</small>
                </div>
                <div className="school-profile-metric">
                  <span>正式註記</span>
                  <strong>{scopeNoteCount.toLocaleString('zh-TW')}</strong>
                  <small>{refreshStatus ?? '尚未執行前端重新載入'}</small>
                </div>
                <div className="school-profile-metric">
                  <span>Schema 版本</span>
                  <strong>{remoteManifest?.schemaVersion ?? localManifest?.schemaVersion ?? '未提供'}</strong>
                  <small>差異刷新與共用 grade-map 契約</small>
                </div>
                <div className="school-profile-metric">
                  <span>驗證狀態</span>
                  <strong>{formatValidationStatus(validationReport)}</strong>
                  <small>
                    {validationReport
                      ? `blocking ${validationReport.items.filter((item) => item.severity === 'blocking' && item.status !== 'pass').length} / warning ${validationReport.items.filter((item) => item.severity === 'warning' && item.status !== 'pass').length}`
                      : '尚未載入 validation-report'}
                  </small>
                </div>
              </div>
            </section>

            <section className="school-chart-panel__section" data-testid="governance-refresh-summary">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">部署刷新</p>
                  <h3>版本比較與差異結果</h3>
                </div>
                <p className="panel-heading__meta">重新載入部署資料時，會先比對 manifest，再只刷新已變更資產；失敗資產會保留 last-known-good 狀態。</p>
              </div>
              <div className="school-profile-sidebar__stats">
                <div className="school-profile-metric">
                  <span>刷新結果</span>
                  <strong>{refreshSummary?.overallStatus ?? 'idle'}</strong>
                  <small>{refreshSummary?.message ?? '尚未執行差異刷新'}</small>
                </div>
                <div className="school-profile-metric">
                  <span>已更新</span>
                  <strong>{refreshSummary?.updatedAssets.length.toLocaleString('zh-TW') ?? '0'}</strong>
                  <small>{refreshSummary?.updatedAssets.slice(0, 2).join('、') || '目前沒有已更新資產'}</small>
                </div>
                <div className="school-profile-metric">
                  <span>略過</span>
                  <strong>{refreshSummary?.skippedAssets.length.toLocaleString('zh-TW') ?? '0'}</strong>
                  <small>{refreshSummary?.skippedAssets.length ? '代表 manifest 判定未變更或非當前作用中的切片' : '無略過資產'}</small>
                </div>
                <div className="school-profile-metric">
                  <span>失敗 / 回退</span>
                  <strong>{`${refreshSummary?.failedAssets.length ?? 0} / ${refreshSummary?.rolledBackAssets.length ?? 0}`}</strong>
                  <small>{refreshSummary?.failedAssets.slice(0, 2).join('、') || '目前沒有需要回退的資產'}</small>
                </div>
              </div>
            </section>

            <section className="school-chart-panel__section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">資料來源</p>
                  <h3>官方採信鏈</h3>
                </div>
                <p className="panel-heading__meta">更新流程以統計處學年度檔為主體，校點與邊界分別由教育 GIS 與 NLSC 補足空間座標與行政區輪廓。</p>
              </div>
              <div className="school-profile-sidebar__info">
                <div className="school-profile-info-row">
                  <span>統計主來源</span>
                  <a className="school-profile-link" href={sources.statistics} target="_blank" rel="noreferrer">教育部統計處正式檔案</a>
                </div>
                <div className="school-profile-info-row">
                  <span>校點來源</span>
                  <a className="school-profile-link" href={sources.points} target="_blank" rel="noreferrer">教育 GIS / 各級學校名錄點位</a>
                </div>
                <div className="school-profile-info-row">
                  <span>縣市邊界</span>
                  <a className="school-profile-link" href={sources.countyBoundaries} target="_blank" rel="noreferrer">國土測繪中心縣市界</a>
                </div>
                <div className="school-profile-info-row">
                  <span>鄉鎮邊界</span>
                  <a className="school-profile-link" href={sources.townshipBoundaries} target="_blank" rel="noreferrer">國土測繪中心鄉鎮市區界</a>
                </div>
              </div>
            </section>

            <section className="school-chart-panel__section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">切片資產</p>
                  <h3>部署尺寸與 fallback 背景</h3>
                </div>
                <p className="panel-heading__meta">114 學年度部分官方靜態檔若延後上線，refresh 腳本會逐年回退個別來源，避免整批更新失敗。</p>
              </div>
              <div className="school-profile-sidebar__stats">
                <div className="school-profile-metric">
                  <span>摘要切片</span>
                  <strong>{formatBytes(assetMetrics?.summaryBytes)}</strong>
                  <small>教育摘要 JSON</small>
                </div>
                <div className="school-profile-metric">
                  <span>縣市細節</span>
                  <strong>{formatBytes(assetMetrics?.countyDetailBytes)}</strong>
                  <small>各縣市明細切片</small>
                </div>
                <div className="school-profile-metric">
                  <span>學校 bucket</span>
                  <strong>{formatBytes(assetMetrics?.countyBucketBytes)}</strong>
                  <small>校點群聚與 hover 預抓</small>
                </div>
                <div className="school-profile-metric">
                  <span>鄉鎮邊界</span>
                  <strong>{formatBytes(assetMetrics?.townshipBoundaryBytes)}</strong>
                  <small>單縣鄉鎮切片</small>
                </div>
                <div className="school-profile-metric">
                  <span>縣市邊界</span>
                  <strong>{formatBytes(assetMetrics?.countyBoundaryBytes)}</strong>
                  <small>全台底圖輪廓</small>
                </div>
                <div className="school-profile-metric">
                  <span>SQLite atlas</span>
                  <strong>{formatBytes(assetMetrics?.sqliteBytes)}</strong>
                  <small>離線查詢快取</small>
                </div>
              </div>
            </section>

            <section className="school-chart-panel__section">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">座標補件</p>
                  <h3>座標補件工作簿</h3>
                </div>
                <p className="panel-heading__meta">把正式缺點位學校轉成可追蹤流程，先標示 GIS 缺點位，再逐筆切到人工補點或已回填。</p>
              </div>
              <div className="school-profile-sidebar__stats">
                <div className="school-profile-metric">
                  <span>待補筆數</span>
                  <strong>{workflowCounts['GIS缺點位'].toLocaleString('zh-TW')}</strong>
                  <small>{workflowRows.length > 0 ? '預設代表正式統計存在、但教育 GIS 尚未提供定位' : '目前摘要資料沒有遺漏座標的學校'}</small>
                </div>
                <div className="school-profile-metric">
                  <span>人工補點</span>
                  <strong>{workflowCounts['人工補點'].toLocaleString('zh-TW')}</strong>
                  <small>已開始人工查找經緯度或交叉比對</small>
                </div>
                <div className="school-profile-metric">
                  <span>已回填</span>
                  <strong>{workflowCounts['已回填'].toLocaleString('zh-TW')}</strong>
                  <small>已完成補件標記，待下次正式資料刷新驗證</small>
                </div>
              </div>
              {workflowRows.length > 0 ? (
                <>
                  <div className="governance-flyout__actions governance-flyout__actions--inline">
                    <div className="chip-row">
                      {(['全部', ...COORDINATE_WORKFLOW_STATUSES] as CoordinateWorkflowFilter[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={workflowFilter === status ? 'chip chip--active' : 'chip'}
                          onClick={() => setWorkflowFilter(status)}
                        >
                          {status} {workflowCounts[status].toLocaleString('zh-TW')}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="ghost-button" onClick={() => downloadMissingCoordinates(workflowRows)}>
                      匯出缺座標 CSV
                    </button>
                  </div>
                  <p className="governance-workflow-note">工作狀態會儲存在本機瀏覽器，方便整理補件進度；下一次正式資料刷新後，仍需以實際座標輸出為準。</p>
                  <div className="governance-missing-list" data-testid="missing-coordinates-list">
                    {filteredWorkflowRows.map((entry) => (
                      <article key={`${entry.code}-${entry.name}`} className="governance-missing-item" data-testid={`missing-coordinate-${entry.code}`}>
                        <div>
                          <strong>{entry.name}</strong>
                          <span>{entry.county} / {entry.township}</span>
                          <span>{entry.coordinateResolution ?? '未標記'}{entry.longitude != null && entry.latitude != null ? ` / ${entry.latitude.toFixed(6)}, ${entry.longitude.toFixed(6)}` : ''}</span>
                          <span>{entry.workflowUpdatedAt ? `更新於 ${new Date(entry.workflowUpdatedAt).toLocaleString('zh-TW')}` : '尚未更新工作狀態'}</span>
                        </div>
                        <div className="governance-missing-item__meta">
                          <strong>{entry.code}</strong>
                          <span>{entry.level}</span>
                          <div className="governance-status-tags">
                            {COORDINATE_WORKFLOW_STATUSES.map((status) => (
                              <button
                                key={`${entry.code}-${status}`}
                                type="button"
                                className={entry.workflowStatus === status ? 'governance-status-tag governance-status-tag--active' : 'governance-status-tag'}
                                onClick={() => updateWorkflowStatus(entry.code, status)}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
            </section>

            {children}
          </div>
        </div>
      </aside>
    </div>
  )
}

export default DataGovernanceFlyout