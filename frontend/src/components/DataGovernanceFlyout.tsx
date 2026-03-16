import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  type CoordinateWorkflowEntry,
  type CoordinateWorkflowStatus,
  type DataManifest,
  type DataRefreshSummary,
  type MissingCoordinateEntry,
  type ValidationReport,
} from '../data/educationTypes'
import { AssetMetricsSection } from './governance/AssetMetricsSection'
import { CoordinateWorkflowSection } from './governance/CoordinateWorkflowSection'
import { DeploymentInsightSection } from './governance/DeploymentInsightSection'
import { GovernanceFooter } from './governance/GovernanceFooter'
import { GovernanceHeader } from './governance/GovernanceHeader'
import { VitalStatusSection } from './governance/VitalStatusSection'

const COORDINATE_WORKFLOW_STORAGE_KEY = 'atlas.coordinate-workflow'

type DataGovernanceFlyoutProps = {
  open: boolean
  onClose: () => void
  generatedAtLabel: string
  refreshStatus: string | null
  isRefreshingData: boolean
  onRefreshData: () => Promise<void>
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

function DataGovernanceFlyout({
  open,
  onClose,
  generatedAtLabel,
  refreshStatus,
  isRefreshingData,
  onRefreshData,
  localManifest,
  remoteManifest,
  validationReport,
  refreshSummary,
  sources,
  assetMetrics,
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

  // Extract date only
  const dateOnly = generatedAtLabel.split(' ')[0]

  return (
    <div className="governance-flyout-layer" role="dialog" aria-modal="false" aria-label="資料治理面板">
      <button type="button" className="governance-flyout-backdrop" aria-label="關閉資料治理面板" onClick={onClose} />
      <aside className="governance-flyout">
        <GovernanceHeader onClose={onClose} />

        <div className="governance-flyout__body">
          <div className="school-chart-panel">
            <VitalStatusSection
              dateOnly={dateOnly}
              generatedAtLabel={generatedAtLabel}
              isRefreshingData={isRefreshingData}
              localManifest={localManifest}
              remoteManifest={remoteManifest}
              validationReport={validationReport}
            />

            <DeploymentInsightSection refreshSummary={refreshSummary} />

            <CoordinateWorkflowSection
              workflowRows={workflowRows}
              workflowCounts={workflowCounts}
              workflowFilter={workflowFilter}
              setWorkflowFilter={setWorkflowFilter}
              updateWorkflowStatus={updateWorkflowStatus}
              downloadMissingCoordinates={downloadMissingCoordinates}
            />

            <AssetMetricsSection assetMetrics={assetMetrics} sources={sources} />

            {children}
          </div>
        </div>

        <GovernanceFooter
          isRefreshingData={isRefreshingData}
          refreshStatus={refreshStatus}
          onRefreshData={onRefreshData}
        />
      </aside>
    </div>
  )
}

export default DataGovernanceFlyout