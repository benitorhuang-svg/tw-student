import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import process from 'node:process'

import { buildBoundaryFiles } from './lib/build-boundary-files.mjs'
import { buildOfficialDataset } from './lib/build-official-dataset.mjs'
import { buildAtlasSqliteBuffer } from './lib/build-atlas-sqlite.mjs'
import { buildGradeMap, DATA_SCHEMA_VERSION } from './lib/build-grade-map.mjs'
import { buildManifest } from './lib/build-manifest.mjs'
import { buildValidationReport } from './lib/build-validation-report.mjs'
import { measurePrettyJsonBytes, writePrettyJson } from './lib/refresh-helpers.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(SCRIPT_DIR, '..', 'dist')

async function prepareOutputDirectories() {
  await rm(DATA_DIR, { recursive: true, force: true })
  await mkdir(DATA_DIR, { recursive: true })
}

function attachAssetMetrics(datasetBundle, boundaries) {
  datasetBundle.summaryDataset.counties.forEach((county) => {
    const detailEntry = datasetBundle.countyDetails.find((entry) => entry.detail.county.id === county.id)
    const bucketEntry = datasetBundle.countyBuckets.find((entry) => entry.detail.county.id === county.id)
    const townshipEntry = boundaries.townshipTopologyByCounty.find((entry) => entry.countyId === county.id)
    county.assetMetrics = {
      detailBytes: detailEntry ? measurePrettyJsonBytes(detailEntry.detail) : 0,
      bucketBytes: bucketEntry ? measurePrettyJsonBytes(bucketEntry.detail) : 0,
      townshipBytes: townshipEntry ? measurePrettyJsonBytes(townshipEntry.topology) : 0,
    }
  })

  datasetBundle.summaryDataset.assetMetrics = {
    summaryBytes: measurePrettyJsonBytes(datasetBundle.summaryDataset),
    countyDetailBytes: datasetBundle.countyDetails.reduce((sum, entry) => sum + measurePrettyJsonBytes(entry.detail), 0),
    countyBucketBytes: datasetBundle.countyBuckets.reduce((sum, entry) => sum + measurePrettyJsonBytes(entry.detail), 0),
    countyBoundaryBytes: measurePrettyJsonBytes(boundaries.countyTopology),
    townshipBoundaryBytes: boundaries.townshipTopologyByCounty.reduce((sum, entry) => sum + measurePrettyJsonBytes(entry.topology), 0),
  }
}

function buildAssetDrafts({ sqliteBuffer, datasetBundle, boundaries }) {
  const summaryJsonBuffer = Buffer.from(JSON.stringify(datasetBundle.summaryDataset), 'utf8')
  const countyTopoJsonBuffer = Buffer.from(JSON.stringify(boundaries.countyTopology), 'utf8')

  return [
    {
      path: 'education-atlas.sqlite',
      assetGroup: 'sqlite',
      critical: true,
      buffer: sqliteBuffer,
    },
    {
      path: 'education-summary.json',
      assetGroup: 'summary',
      critical: true,
      buffer: summaryJsonBuffer,
    },
    {
      path: 'counties.topo.json',
      assetGroup: 'county-boundary',
      critical: true,
      buffer: countyTopoJsonBuffer,
    },
  ]
}

async function writeAtlasOutputs(assetDrafts, manifest) {
  await Promise.all([
    ...assetDrafts.map((entry) => {
      const filePath = path.join(DATA_DIR, entry.path)
      if (entry.buffer) {
        return writeFile(filePath, entry.buffer)
      }
      return writePrettyJson(filePath, entry.value)
    }),
    writePrettyJson(path.join(DATA_DIR, 'manifest.json'), manifest),
  ])
}

async function main() {
  console.log('Refreshing official MOE and NLSC data...')
  await prepareOutputDirectories()

  const boundaries = await buildBoundaryFiles()
  const datasetBundle = await buildOfficialDataset(boundaries)
  attachAssetMetrics(datasetBundle, boundaries)

  // 1. 先建立 Grade Map 與初步的 Validation Report
  const gradeMap = buildGradeMap(datasetBundle.generatedAt)
  const validationReport = buildValidationReport({
    generatedAt: datasetBundle.generatedAt,
    schemaVersion: DATA_SCHEMA_VERSION,
    datasetBundle,
    boundaries,
    assetDrafts: [], // 這裡傳空，因為內部校驗不依賴二進位雜湊
  })

  // 2. 將所有內容（包含 Report 與 Grade Map）封裝進 SQLite
  const sqliteBuffer = await buildAtlasSqliteBuffer(datasetBundle, boundaries, {
    validationReport,
    gradeMap
  })

  // 3. 更新度量指標
  datasetBundle.summaryDataset.assetMetrics.sqliteBytes = sqliteBuffer.byteLength
  datasetBundle.summaryDataset.counties = datasetBundle.summaryDataset.counties.map((county) => ({
    ...county,
    assetMetrics: {
      ...county.assetMetrics,
      sqliteBytes: sqliteBuffer.byteLength,
    },
  }))

  // 4. 建立最終的基本資產清單與 Manifest (包含雙層架構 Tier 1 JSON 與 Tier 2 SQLite)
  const assetDrafts = buildAssetDrafts({ sqliteBuffer, datasetBundle, boundaries })

  const { manifest } = buildManifest({
    generatedAt: datasetBundle.generatedAt,
    schemaVersion: DATA_SCHEMA_VERSION,
    validationReport,
    assetDrafts,
  })

  // 5. 寫出檔案
  await writeAtlasOutputs(assetDrafts, manifest)

  console.log('Official dataset refreshed successfully.')
  console.log('Generated Tier 1 education-summary.json & counties.topo.json, and Tier 2 education-atlas.sqlite')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
