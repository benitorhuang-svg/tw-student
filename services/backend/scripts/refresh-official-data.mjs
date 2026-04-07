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
const COUNTY_DETAIL_DIR = path.join(DATA_DIR, 'counties')
const TOWNSHIP_DIR = path.join(DATA_DIR, 'townships')
const BUCKET_DIR = path.join(DATA_DIR, 'buckets')
const SCHOOL_ATLAS_DIR = path.join(DATA_DIR, 'school-atlas')
const SCHEMA_DIR = path.join(DATA_DIR, 'schema')

async function prepareOutputDirectories() {
  await Promise.all([
    mkdir(DATA_DIR, { recursive: true }),
    rm(COUNTY_DETAIL_DIR, { recursive: true, force: true }),
    rm(TOWNSHIP_DIR, { recursive: true, force: true }),
    rm(BUCKET_DIR, { recursive: true, force: true }),
    rm(SCHOOL_ATLAS_DIR, { recursive: true, force: true }),
    rm(SCHEMA_DIR, { recursive: true, force: true }),
    rm(path.join(DATA_DIR, 'county-boundaries.geojson'), { force: true }),
    rm(path.join(DATA_DIR, 'township-boundaries.geojson'), { force: true }),
    rm(path.join(DATA_DIR, 'education-dataset.json'), { force: true }),
    rm(path.join(DATA_DIR, 'education-atlas.sqlite'), { force: true }),
    rm(path.join(DATA_DIR, 'area-coordinate-lookup.json'), { force: true }),
    rm(path.join(DATA_DIR, 'school-coordinate-lookup.json'), { force: true }),
    rm(path.join(DATA_DIR, 'school-atlas.json'), { force: true }),
    rm(path.join(DATA_DIR, 'manifest.json'), { force: true }),
    rm(path.join(DATA_DIR, 'validation-report.json'), { force: true }),
  ])

  await mkdir(COUNTY_DETAIL_DIR, { recursive: true })
  await mkdir(TOWNSHIP_DIR, { recursive: true })
  await mkdir(BUCKET_DIR, { recursive: true })
  await mkdir(SCHOOL_ATLAS_DIR, { recursive: true })
  await mkdir(SCHEMA_DIR, { recursive: true })
}

function attachAssetMetrics(datasetBundle, boundaries) {
  datasetBundle.summaryDataset.counties.forEach((county) => {
    const detailEntry = datasetBundle.countyDetails.find((entry) => entry.detail.county.id === county.id)
    const bucketEntry = datasetBundle.countyBuckets.find((entry) => entry.detail.county.id === county.id)
    const townshipEntry = boundaries.townshipTopologyByCounty.find((entry) => entry.countyId === county.id)
    const schoolAtlasEntry = datasetBundle.countySchoolAtlasSlices.find((entry) => entry.countyId === county.id)
    county.assetMetrics = {
      detailBytes: detailEntry ? measurePrettyJsonBytes(detailEntry.detail) : 0,
      bucketBytes: bucketEntry ? measurePrettyJsonBytes(bucketEntry.detail) : 0,
      townshipBytes: townshipEntry ? measurePrettyJsonBytes(townshipEntry.topology) : 0,
      schoolAtlasBytes: schoolAtlasEntry ? measurePrettyJsonBytes(schoolAtlasEntry.detail) : 0,
    }
  })

  datasetBundle.summaryDataset.assetMetrics = {
    summaryBytes: measurePrettyJsonBytes(datasetBundle.summaryDataset),
    countyDetailBytes: datasetBundle.countyDetails.reduce((sum, entry) => sum + measurePrettyJsonBytes(entry.detail), 0),
    countyBucketBytes: datasetBundle.countyBuckets.reduce((sum, entry) => sum + measurePrettyJsonBytes(entry.detail), 0),
    schoolAtlasBytes: datasetBundle.countySchoolAtlasSlices.reduce((sum, entry) => sum + measurePrettyJsonBytes(entry.detail), 0),
    countyBoundaryBytes: measurePrettyJsonBytes(boundaries.countyTopology),
    townshipBoundaryBytes: boundaries.townshipTopologyByCounty.reduce((sum, entry) => sum + measurePrettyJsonBytes(entry.topology), 0),
  }
}

function buildAssetDrafts({ datasetBundle, boundaries, sqliteBuffer, gradeMap, validationReport }) {
  const areaCoordinateLookup = {
    generatedAt: datasetBundle.summaryDataset.generatedAt,
    counties: boundaries.countyCoordinateLookup,
    townships: boundaries.townshipCoordinateLookup,
  }

  return [
    {
      path: 'education-summary.json',
      assetGroup: 'summary',
      critical: true,
      value: datasetBundle.summaryDataset,
    },
    {
      path: 'validation-report.json',
      assetGroup: 'validation',
      critical: true,
      value: validationReport,
    },
    {
      path: 'schema/grade-map.json',
      assetGroup: 'schema',
      critical: true,
      value: gradeMap,
    },
    {
      path: 'school-atlas/index.json',
      assetGroup: 'school-atlas-index',
      value: datasetBundle.schoolAtlasIndexDataset,
    },
    {
      path: 'county-boundaries.topo.json',
      assetGroup: 'county-boundary',
      critical: true,
      value: boundaries.countyTopology,
    },
    {
      path: 'area-coordinate-lookup.json',
      assetGroup: 'lookup',
      value: areaCoordinateLookup,
    },
    {
      path: 'school-coordinate-lookup.json',
      assetGroup: 'lookup',
      value: datasetBundle.schoolCoordinateLookup,
    },
    {
      path: 'education-atlas.sqlite',
      assetGroup: 'sqlite',
      critical: true,
      buffer: sqliteBuffer,
    },
    ...datasetBundle.countyDetails.map((entry) => ({
      path: `counties/${entry.fileName}`,
      assetGroup: 'county-detail',
      countyId: entry.detail.county.id,
      countyCode: entry.detail.county.countyCode,
      value: entry.detail,
    })),
    ...datasetBundle.countyBuckets.map((entry) => ({
      path: `buckets/${entry.fileName}`,
      assetGroup: 'county-bucket',
      countyId: entry.detail.county.id,
      countyCode: entry.detail.county.countyCode,
      value: entry.detail,
    })),
    ...datasetBundle.countySchoolAtlasSlices.map((entry) => ({
      path: entry.fileName,
      assetGroup: 'school-atlas',
      countyId: entry.countyId,
      countyCode: entry.detail.county.countyCode,
      value: entry.detail,
    })),
    ...boundaries.townshipTopologyByCounty.map((entry) => ({
      path: `townships/${entry.fileName}`,
      assetGroup: 'township-boundary',
      countyId: entry.countyId,
      countyCode: boundaries.countyCoordinateLookup[entry.countyId]?.countyCode,
      value: entry.topology,
    })),
  ]
}

async function writeAtlasOutputs(assetDrafts, manifest) {
  // 只保留重要的兩個檔案，其餘全部整合進 SQLite
  const filteredDrafts = assetDrafts.filter(entry => 
    entry.path === 'education-atlas.sqlite' || 
    entry.path === 'manifest.json'
  )

  await Promise.all([
    ...filteredDrafts.map((entry) => {
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
  // 只留核心資料庫，其餘 JSON 均已整併
  const fullAssetDrafts = buildAssetDrafts({
    datasetBundle,
    boundaries,
    sqliteBuffer,
    gradeMap,
    validationReport,
  })
  
  const assetDrafts = fullAssetDrafts.filter(entry => entry.path === 'education-atlas.sqlite')

  const { manifest } = buildManifest({
    generatedAt: datasetBundle.generatedAt,
    schemaVersion: DATA_SCHEMA_VERSION,
    validationReport,
    assetDrafts,
  })

  // 5. 寫出檔案
  await writeAtlasOutputs(fullAssetDrafts, manifest)

  console.log('Official dataset refreshed successfully.')
  console.log('Consolidated all data into education-atlas.sqlite')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
