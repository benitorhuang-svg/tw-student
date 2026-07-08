import { recordResourceLoad } from './atlasLoadObservation'
import { buildDataAssetUrl, parseJsonDataResponse } from './dataAsset'
import { mapRows, parseJsonValue } from './sqlite/mappers'
import type { DataManifest, ValidationReport } from './educationTypes'

const MANIFEST_RESOURCE_KEY = 'manifest:manifest.json'
const VALIDATION_RESOURCE_KEY = 'validation:validation-report.sqlite'

let manifestCache: DataManifest | null = null
let validationReportCache: ValidationReport | null = null
let pendingManifestRequest: Promise<DataManifest> | null = null
let pendingValidationRequest: Promise<ValidationReport> | null = null

type ManifestLoadOptions = {
  forceRefresh?: boolean
}

function byteLengthOfText(text: string) {
  return new TextEncoder().encode(text).length
}

function buildDataUrl(relativePath: string, forceRefresh = false) {
  return buildDataAssetUrl(relativePath, forceRefresh)
}

async function fetchJsonWithMetrics<T>(relativePath: string, resourceKey: string, options: ManifestLoadOptions = {}) {
  const url = buildDataUrl(relativePath, options.forceRefresh)
  const response = await fetch(url, {
    cache: options.forceRefresh ? 'no-store' : 'default',
  })

  const text = await response.text()
  const value = await parseJsonDataResponse<T>(new Response(text, { status: response.status, statusText: response.statusText, headers: response.headers }), relativePath, url)
  recordResourceLoad({
    source: 'network',
    resourceKey,
    bytes: byteLengthOfText(text),
  })

  return value
}

export async function loadDataManifest(options: ManifestLoadOptions = {}) {
  if (options.forceRefresh) {
    manifestCache = null
    pendingManifestRequest = null
  }

  if (manifestCache) {
    recordResourceLoad({
      source: 'memory',
      resourceKey: MANIFEST_RESOURCE_KEY,
    })
    return manifestCache
  }

  if (!pendingManifestRequest) {
    pendingManifestRequest = fetchJsonWithMetrics<DataManifest>('manifest.json', MANIFEST_RESOURCE_KEY, options)
      .then((manifest) => {
        manifestCache = manifest
        return manifest
      })
      .finally(() => {
        pendingManifestRequest = null
      })
  }

  return pendingManifestRequest
}

export async function loadValidationReport(options: ManifestLoadOptions = {}) {
  if (options.forceRefresh) {
    validationReportCache = null
    pendingValidationRequest = null
  }

  if (validationReportCache) {
    recordResourceLoad({
      source: 'memory',
      resourceKey: VALIDATION_RESOURCE_KEY,
    })
    return validationReportCache
  }

  if (!pendingValidationRequest) {
    pendingValidationRequest = (async () => {
      const bytes = await import('./sqlite/sqliteWorkerClient').then((m) => m.initSqliteWorker(options.forceRefresh))
      const rows = mapRows(await import('./sqlite/sqliteWorkerClient').then(m => m.execInSqlite("SELECT value FROM meta WHERE key = 'validationReport'")))
      const reportJson = rows[0]?.value as string
      
      if (!reportJson) {
         // 回退機制或是預設值
         return {
           generatedAt: '',
           schemaVersion: '',
           overallStatus: 'pass' as const,
           items: []
         }
      }

      const report = parseJsonValue<ValidationReport>(reportJson, {
        generatedAt: '',
        schemaVersion: '',
        overallStatus: 'pass',
        items: []
      })

      validationReportCache = report
      recordResourceLoad({
        source: 'sqlite',
        resourceKey: VALIDATION_RESOURCE_KEY,
        bytes,
      })
      return report
    })()
  }

  return pendingValidationRequest
}

export function diffManifestAssets(localManifest: DataManifest | null, remoteManifest: DataManifest) {
  const localAssetLookup = new Map((localManifest?.assets ?? []).map((asset) => [asset.path, asset.hash]))
  const changedAssets = remoteManifest.assets.filter((asset) => localAssetLookup.get(asset.path) !== asset.hash)
  const unchangedAssets = remoteManifest.assets.filter((asset) => localAssetLookup.get(asset.path) === asset.hash)

  return {
    changedAssets,
    unchangedAssets,
  }
}

export function resetAtlasManifestCache() {
  manifestCache = null
  validationReportCache = null
  pendingManifestRequest = null
  pendingValidationRequest = null
}
