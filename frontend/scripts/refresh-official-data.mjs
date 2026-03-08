import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { buildBoundaryFiles } from './lib/build-boundary-files.mjs'
import { buildOfficialDataset } from './lib/build-official-dataset.mjs'
import { buildAtlasSqliteBuffer } from './lib/build-atlas-sqlite.mjs'
import { measurePrettyJsonBytes, writePrettyJson } from './lib/refresh-helpers.mjs'

const DATA_DIR = path.resolve(process.cwd(), 'public', 'data')
const COUNTY_DETAIL_DIR = path.join(DATA_DIR, 'counties')
const TOWNSHIP_DIR = path.join(DATA_DIR, 'townships')
const BUCKET_DIR = path.join(DATA_DIR, 'buckets')

async function prepareOutputDirectories() {
  await Promise.all([
    mkdir(DATA_DIR, { recursive: true }),
    rm(COUNTY_DETAIL_DIR, { recursive: true, force: true }),
    rm(TOWNSHIP_DIR, { recursive: true, force: true }),
    rm(BUCKET_DIR, { recursive: true, force: true }),
    rm(path.join(DATA_DIR, 'county-boundaries.geojson'), { force: true }),
    rm(path.join(DATA_DIR, 'township-boundaries.geojson'), { force: true }),
    rm(path.join(DATA_DIR, 'education-dataset.json'), { force: true }),
    rm(path.join(DATA_DIR, 'education-atlas.sqlite'), { force: true }),
  ])

  await mkdir(COUNTY_DETAIL_DIR, { recursive: true })
  await mkdir(TOWNSHIP_DIR, { recursive: true })
  await mkdir(BUCKET_DIR, { recursive: true })
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

async function writeAtlasOutputs(datasetBundle, boundaries, sqliteBuffer) {
  await Promise.all([
    writePrettyJson(path.join(DATA_DIR, 'education-summary.json'), datasetBundle.summaryDataset),
    writePrettyJson(path.join(DATA_DIR, 'county-boundaries.topo.json'), boundaries.countyTopology),
    writeFile(path.join(DATA_DIR, 'education-atlas.sqlite'), sqliteBuffer),
    ...datasetBundle.countyDetails.map((entry) => writePrettyJson(path.join(COUNTY_DETAIL_DIR, entry.fileName), entry.detail)),
    ...datasetBundle.countyBuckets.map((entry) => writePrettyJson(path.join(BUCKET_DIR, entry.fileName), entry.detail)),
    ...boundaries.townshipTopologyByCounty.map((entry) => writePrettyJson(path.join(TOWNSHIP_DIR, entry.fileName), entry.topology)),
  ])
}

async function main() {
  console.log('Refreshing official MOE and NLSC data...')
  await prepareOutputDirectories()

  const [datasetBundle, boundaries] = await Promise.all([buildOfficialDataset(), buildBoundaryFiles()])
  attachAssetMetrics(datasetBundle, boundaries)

  const sqliteBuffer = await buildAtlasSqliteBuffer(datasetBundle)
  datasetBundle.summaryDataset.assetMetrics.sqliteBytes = sqliteBuffer.byteLength
  datasetBundle.summaryDataset.counties = datasetBundle.summaryDataset.counties.map((county) => ({
    ...county,
    assetMetrics: {
      ...county.assetMetrics,
      sqliteBytes: sqliteBuffer.byteLength,
    },
  }))

  await writeAtlasOutputs(datasetBundle, boundaries, sqliteBuffer)

  console.log('Official dataset refreshed successfully.')
  console.log(`Generated ${datasetBundle.summaryDataset.counties.length} county summaries.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
