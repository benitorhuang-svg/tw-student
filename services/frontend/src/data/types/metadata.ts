export type ValidationSeverity = 'blocking' | 'warning' | 'info'
export type ValidationStatus = 'pass' | 'warning' | 'fail'

export type DataNote = {
  type: '停辦' | '缺年度' | '行政區改制' | '名稱異動' | '異常值' | '其他'
  message: string
  severity: 'info' | 'warning' | 'critical'
  years?: number[]
}

export type ValidationReportItem = {
  ruleId: string
  severity: ValidationSeverity
  status: ValidationStatus
  scope: string
  affectedAssets: string[]
  affectedRecordCount: number
  samples?: Array<Record<string, string | number | boolean | null | undefined>>
  recommendedAction: string
}

export type ValidationSummary = {
  overallStatus: ValidationStatus
  blockingCount: number
  warningCount: number
  infoCount: number
}

export type ValidationReport = {
  generatedAt: string
  schemaVersion: string
  overallStatus: ValidationStatus
  items: ValidationReportItem[]
}

export type DataAssetGroup =
  | 'summary'
  | 'validation'
  | 'schema'
  | 'county-boundary'
  | 'lookup'
  | 'sqlite'
  | 'county-detail'
  | 'county-bucket'
  | 'township-boundary'

export type DataManifestAsset = {
  path: string
  assetGroup: DataAssetGroup
  hash: string
  bytes: number
  dependsOnSchemaVersion: string
  critical: boolean
  countyId?: string
  countyCode?: string
  legacyAliases?: string[]
}

export type DataManifest = {
  schemaVersion: string
  generatedAt: string
  buildId: string
  contentHash: string
  previousCompatibleSchemaVersions: string[]
  validationSummary: ValidationSummary
  assets: DataManifestAsset[]
}

export type DataRefreshSummary = {
  checkedAt: string
  overallStatus: 'idle' | 'up-to-date' | 'updated' | 'partial-failure' | 'failed' | 'fallback'
  localGeneratedAt?: string
  remoteGeneratedAt?: string
  localContentHash?: string
  remoteContentHash?: string
  schemaVersion?: string
  updatedAssets: string[]
  skippedAssets: string[]
  failedAssets: string[]
  rolledBackAssets: string[]
  message: string
}

export const COORDINATE_WORKFLOW_STATUSES = ['GIS缺點位', '人工補點', '已回填'] as const
export type CoordinateWorkflowStatus = (typeof COORDINATE_WORKFLOW_STATUSES)[number]

export type CoordinateWorkflowEntry = {
  schoolCode: string
  status: CoordinateWorkflowStatus
  updatedAt: string
}
