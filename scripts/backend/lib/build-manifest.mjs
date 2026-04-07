import { buildCompositeHash, hashBuffer, toPrettyJsonBuffer } from './hash-file.mjs'
import { summarizeValidationReport } from './build-validation-report.mjs'

function toBuildId(generatedAt) {
  return generatedAt.replace(/[-:TZ.]/g, '').slice(0, 14)
}

function resolveAssetDraft(draft, schemaVersion) {
  const buffer = draft.buffer ?? toPrettyJsonBuffer(draft.value)

  return {
    path: draft.path,
    assetGroup: draft.assetGroup,
    hash: hashBuffer(buffer),
    bytes: buffer.byteLength,
    dependsOnSchemaVersion: draft.dependsOnSchemaVersion ?? schemaVersion,
    critical: draft.critical ?? false,
    countyId: draft.countyId,
    countyCode: draft.countyCode,
    legacyAliases: draft.legacyAliases,
    buffer,
  }
}

export function buildManifest({ generatedAt, schemaVersion, validationReport, assetDrafts }) {
  const resolvedAssets = assetDrafts.map((draft) => resolveAssetDraft(draft, schemaVersion))
  const manifest = {
    schemaVersion,
    generatedAt,
    buildId: toBuildId(generatedAt),
    contentHash: buildCompositeHash(resolvedAssets),
    previousCompatibleSchemaVersions: [],
    validationSummary: summarizeValidationReport(validationReport),
    assets: resolvedAssets.map(({ buffer, ...asset }) => asset),
  }

  return {
    manifest,
    resolvedAssets,
  }
}