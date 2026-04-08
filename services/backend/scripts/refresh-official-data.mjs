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
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..', '..')
const DATA_DIR = path.join(REPO_ROOT, 'data')

async function prepareOutputDirectories() {
  await Promise.all([
    mkdir(DATA_DIR, { recursive: true }),
    rm(path.join(DATA_DIR, 'counties'), { recursive: true, force: true }),
    rm(path.join(DATA_DIR, 'townships'), { recursive: true, force: true }),
    rm(path.join(DATA_DIR, 'buckets'), { recursive: true, force: true }),
    rm(path.join(DATA_DIR, 'school-atlas'), { recursive: true, force: true }),
    rm(path.join(DATA_DIR, 'schema'), { recursive: true, force: true }),
    rm(path.join(DATA_DIR, 'county-boundaries.geojson'), { force: true }),
    rm(path.join(DATA_DIR, 'county-boundaries.topo.json'), { force: true }),
    rm(path.join(DATA_DIR, 'township-boundaries.geojson'), { force: true }),
    rm(path.join(DATA_DIR, 'education-dataset.json'), { force: true }),
    rm(path.join(DATA_DIR, 'education-summary.json'), { force: true }),
    rm(path.join(DATA_DIR, 'education-atlas.sqlite'), { force: true }),
    rm(path.join(DATA_DIR, 'education-atlas.sqlite.gz'), { force: true }),
    rm(path.join(DATA_DIR, 'area-coordinate-lookup.json'), { force: true }),
    rm(path.join(DATA_DIR, 'school-coordinate-lookup.json'), { force: true }),
    rm(path.join(DATA_DIR, 'school-atlas.json'), { force: true }),
    rm(path.join(DATA_DIR, 'manifest.json'), { force: true }),
    rm(path.join(DATA_DIR, 'validation-report.json'), { force: true }),
  ])
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

function buildAssetDrafts({ sqliteBuffer }) {
  return [
    {
      path: 'education-atlas.sqlite',
      assetGroup: 'sqlite',
      critical: true,
      buffer: sqliteBuffer,
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

  // 4. 建立最終的基本資產清單與 Manifest
  const assetDrafts = buildAssetDrafts({ sqliteBuffer })

  const { manifest } = buildManifest({
    generatedAt: datasetBundle.generatedAt,
    schemaVersion: DATA_SCHEMA_VERSION,
    validationReport,
    assetDrafts,
  })

  // 5. 寫出檔案
  await writeAtlasOutputs(assetDrafts, manifest)

  console.log('Official dataset refreshed successfully.')
  console.log('Consolidated all data into education-atlas.sqlite')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
