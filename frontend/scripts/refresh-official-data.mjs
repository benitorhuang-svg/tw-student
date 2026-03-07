import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { parse } from 'csv-parse/sync'
import shp from 'shpjs'
import { topology } from 'topojson-server'

const CURRENT_YEAR = 113
const ACADEMIC_YEARS = [107, 108, 109, 110, 111, 112, 113]
const DATA_DIR = path.resolve(process.cwd(), 'public', 'data')
const COUNTY_DETAIL_DIR = path.join(DATA_DIR, 'counties')
const TOWNSHIP_DIR = path.join(DATA_DIR, 'townships')
const TOPOLOGY_QUANTIZATION = 1e5
const SUMMARY_EDUCATION_LEVELS = ['全部', '國小', '國中', '高中職', '大專院校']
const SUMMARY_MANAGEMENT_TYPES = ['全部', '公立', '私立']

const REGION_BY_COUNTY = {
  基隆市: '北部',
  臺北市: '北部',
  新北市: '北部',
  桃園市: '北部',
  新竹市: '北部',
  新竹縣: '北部',
  宜蘭縣: '北部',
  苗栗縣: '中部',
  臺中市: '中部',
  彰化縣: '中部',
  南投縣: '中部',
  雲林縣: '中部',
  嘉義市: '南部',
  嘉義縣: '南部',
  臺南市: '南部',
  高雄市: '南部',
  屏東縣: '南部',
  花蓮縣: '東部',
  臺東縣: '東部',
  澎湖縣: '離島',
  金門縣: '離島',
  連江縣: '離島',
}

const LEVEL_CONFIG = {
  國小: {
    pointLevel: '國民小學',
    directoryFiles: ['e1_new.csv'],
    detailFile: 'basec.csv',
    sumRow: (row) =>
      number(row['1年級男學生數']) +
      number(row['1年級女學生數']) +
      number(row['2年級男學生數']) +
      number(row['2年級女學生數']) +
      number(row['3年級男學生數']) +
      number(row['3年級女學生數']) +
      number(row['4年級男學生數']) +
      number(row['4年級女學生數']) +
      number(row['5年級男學生數']) +
      number(row['5年級女學生數']) +
      number(row['6年級男學生數']) +
      number(row['6年級女學生數']),
  },
  國中: {
    pointLevel: '國民中學',
    directoryFiles: ['j1_new.csv'],
    detailFile: 'basej.csv',
    sumRow: (row) =>
      number(row['學生數7年級男']) +
      number(row['學生數7年級女']) +
      number(row['學生數8年級男']) +
      number(row['學生數8年級女']) +
      number(row['學生數9年級男']) +
      number(row['學生數9年級女']),
  },
  高中職: {
    pointLevel: '高級中等學校',
    directoryFiles: ['high.csv'],
    detailFile: 'base0.csv',
    sumRow: (row) => number(row['學生數男']) + number(row['學生數女']),
  },
  大專院校: {
    pointLevel: '大專校院',
    directoryFiles: ['u1_new.csv', 'u2_new.csv', 'u3_new.csv'],
    detailFiles: [
      {
        name: 'student.csv',
        sumRow: (row) => number(row['總計']),
      },
      {
        name: 'highera1.csv',
        sumRow: (row) => number(row['二專學生數']) + number(row['二技(大學)學生數']),
      },
      {
        name: 'higherr.csv',
        sumRow: (row) => number(row['學生數學士']) + number(row['學生數碩士']) + number(row['學生數博士']),
      },
    ],
  },
}

const COUNTY_BOUNDARY_URLS = [
  'https://maps.nlsc.gov.tw/download/%E7%9B%B4%E8%BD%84%E5%B8%82%E3%80%81%E7%B8%A3(%E5%B8%82)%E7%95%8C%E7%B7%9A(TWD97%E7%B6%93%E7%B7%AF%E5%BA%A6).zip',
  'https://www.tgos.tw/tgos/VirtualDir/Product/1cd4f4c9-6b01-4cf9-bf6c-23a73aa17d24/%E7%9B%B4%E8%BD%84%E5%B8%82%E3%80%81%E7%B8%A3(%E5%B8%82)%E7%95%8C%E7%B7%9A1140318.zip',
]

const TOWNSHIP_BOUNDARY_URLS = [
  'https://maps.nlsc.gov.tw/download/%E9%84%89%E9%8E%AE%E5%B8%82%E5%8D%80%E7%95%8C%E7%B7%9A(TWD97%E7%B6%93%E7%B7%AF%E5%BA%A6).zip',
  'https://www.tgos.tw/tgos/VirtualDir/Product/3fe61d4a-ca23-4f45-8aca-4a536f40f290/%E9%84%89(%E9%8E%AE%E3%80%81%E5%B8%82%E3%80%81%E5%8D%80)%E7%95%8C%E7%B7%9A1140318.zip',
]

function number(value) {
  if (value == null) {
    return 0
  }

  const normalized = String(value).replace(/,/g, '').trim()
  if (!normalized) {
    return 0
  }

  return Number.parseInt(normalized, 10) || 0
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/^\ufeff/, '')
    .replace(/^\[[^\]]+\]/, '')
    .replace(/^\d+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/台/g, '臺')
    .trim()
}

function normalizeCountyName(value) {
  return normalizeText(value)
}

function normalizeTownName(value) {
  return normalizeText(value)
}

function normalizeSchoolCode(value) {
  return String(value ?? '').replace(/^\ufeff/, '').trim()
}

function shortCountyLabel(countyName) {
  if (countyName === '新北市') {
    return '新北'
  }

  if (countyName === '新竹市') {
    return '竹市'
  }

  if (countyName === '新竹縣') {
    return '竹縣'
  }

  if (countyName === '嘉義市') {
    return '嘉市'
  }

  if (countyName === '嘉義縣') {
    return '嘉縣'
  }

  return countyName.replace(/縣|市/g, '')
}

function toFileSlug(value) {
  return value
}

function toCountyDetailFile(countyId) {
  return `${toFileSlug(countyId)}.json`
}

function summaryBucketKey(educationLevel, managementType) {
  return `${educationLevel}|${managementType}`
}

function parseCsv(text) {
  return parse(text, {
    bom: true,
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  })
}

async function fetchText(url) {
  return fetchWithRetry(url, 'text')
}

async function fetchJson(url) {
  return fetchWithRetry(url, 'json')
}

async function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

async function fetchWithRetry(url, responseType, attempts = 3) {
  let lastError = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`)
      }

      if (responseType === 'json') {
        return response.json()
      }

      if (responseType === 'arrayBuffer') {
        return response.arrayBuffer()
      }

      return response.text()
    } catch (error) {
      lastError = error
      if (attempt < attempts) {
        await wait(attempt * 1200)
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`)
}

async function fetchArrayBufferWithFallback(urls) {
  let lastError = null

  for (const url of urls) {
    try {
      return await fetchWithRetry(url, 'arrayBuffer')
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error('Unable to download official boundary dataset')
}

function flattenShapeResult(shapeResult) {
  if (shapeResult.type === 'FeatureCollection') {
    return shapeResult.features
  }

  if (Array.isArray(shapeResult)) {
    return shapeResult.flatMap((item) => flattenShapeResult(item))
  }

  return []
}

function roundCoordinates(value) {
  if (Array.isArray(value)) {
    return value.map(roundCoordinates)
  }

  if (typeof value === 'number') {
    return Number(value.toFixed(6))
  }

  return value
}

function sanitizeFeature(feature, properties) {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: feature.geometry.type,
      coordinates: roundCoordinates(feature.geometry.coordinates),
    },
  }
}

function getMissingYears(yearlyStudents) {
  return ACADEMIC_YEARS.filter((year) => !yearlyStudents.some((entry) => entry.year === year && entry.students > 0))
}

function buildSchoolAnnotations(yearlyStudents) {
  const missingYears = getMissingYears(yearlyStudents)
  const latestStudents = yearlyStudents.at(-1)?.students ?? 0
  const historicalStudents = yearlyStudents.slice(0, -1).some((entry) => entry.students > 0)
  const dataNotes = []
  let status = '正常'

  if (missingYears.length > 0) {
    dataNotes.push({
      type: '缺年度',
      message: `缺少學年度資料：${missingYears.join('、')}`,
      severity: 'warning',
      years: missingYears,
    })
  }

  if (latestStudents === 0 && historicalStudents) {
    status = '待確認'
    dataNotes.push({
      type: '異常值',
      message: `${CURRENT_YEAR} 學年學生數為 0，可能涉及停辦、整併或資料尚未更新。`,
      severity: 'warning',
      years: [CURRENT_YEAR],
    })
  }

  return {
    missingYears,
    dataNotes,
    status,
  }
}

function buildScopeNotes(schools, scopeName) {
  const schoolsWithMissingYears = schools.filter((school) => (school.missingYears?.length ?? 0) > 0)
  const schoolsPendingVerification = schools.filter((school) => school.status === '待確認')
  const dataNotes = []

  if (schoolsWithMissingYears.length > 0) {
    dataNotes.push({
      type: '缺年度',
      message: `${scopeName} 有 ${schoolsWithMissingYears.length} 所學校存在年度缺漏。`,
      severity: 'warning',
    })
  }

  if (schoolsPendingVerification.length > 0) {
    dataNotes.push({
      type: '異常值',
      message: `${scopeName} 有 ${schoolsPendingVerification.length} 所學校最新學年學生數為 0，需留意停辦或整併可能。`,
      severity: 'info',
      years: [CURRENT_YEAR],
    })
  }

  return dataNotes
}

function getStudentsForYear(school, year) {
  return school.yearlyStudents.find((entry) => entry.year === year)?.students ?? 0
}

function buildSummarySeries(schools) {
  const summaries = {}

  for (const educationLevel of SUMMARY_EDUCATION_LEVELS) {
    for (const managementType of SUMMARY_MANAGEMENT_TYPES) {
      const filteredSchools = schools.filter((school) => {
        const matchesEducationLevel = educationLevel === '全部' || school.educationLevel === educationLevel
        const matchesManagementType = managementType === '全部' || school.managementType === managementType
        return matchesEducationLevel && matchesManagementType
      })

      summaries[summaryBucketKey(educationLevel, managementType)] = ACADEMIC_YEARS.map((year) => ({
        year,
        students: filteredSchools.reduce((sum, school) => sum + getStudentsForYear(school, year), 0),
        schools: filteredSchools.length,
      }))
    }
  }

  return summaries
}

async function writePrettyJson(filePath, value) {
  await writeFile(filePath, JSON.stringify(value, null, 2) + '\n')
}

function measurePrettyJsonBytes(value) {
  return new TextEncoder().encode(JSON.stringify(value, null, 2) + '\n').length
}

async function fetchAllSchoolPoints() {
  const allFeatures = []
  let offset = 0
  const pageSize = 2000

  while (true) {
    const query = new URLSearchParams({
      where: '1=1',
      outFields: '代碼,學校名稱,縣市名稱,鄉鎮市區,學校級別,地址,電話,網址,學校概況,體系別',
      orderByFields: 'objectid',
      resultOffset: String(offset),
      resultRecordCount: String(pageSize),
      outSR: '4326',
      f: 'pjson',
    })

    const result = await fetchJson(
      `https://stats.moe.gov.tw/server/rest/services/Hosted/113學年各級學校名錄點位/FeatureServer/0/query?${query.toString()}`,
    )

    allFeatures.push(...result.features)

    if (!result.exceededTransferLimit || result.features.length < pageSize) {
      break
    }

    offset += pageSize
  }

  return allFeatures
}

function inferManagementType(directoryRow, schoolName) {
  if (directoryRow?.['公/私立']) {
    return normalizeText(directoryRow['公/私立'])
  }

  return schoolName.includes('私立') ? '私立' : '公立'
}

async function buildDirectoryLookup() {
  const lookup = new Map()

  for (const config of Object.values(LEVEL_CONFIG)) {
    for (const fileName of config.directoryFiles) {
      const rows = parseCsv(await fetchText(`https://stats.moe.gov.tw/files/school/${CURRENT_YEAR}/${fileName}`))

      for (const row of rows) {
        lookup.set(normalizeSchoolCode(row['代碼']), row)
      }
    }
  }

  return lookup
}

async function buildTrendLookup() {
  const trendsByCode = new Map()

  const addTrendValue = (code, year, level, students) => {
    if (!code || students <= 0) {
      return
    }

    if (!trendsByCode.has(code)) {
      trendsByCode.set(code, { level, yearlyStudents: new Map() })
    }

    const entry = trendsByCode.get(code)
    entry.level = level
    entry.yearlyStudents.set(year, students + (entry.yearlyStudents.get(year) ?? 0))
  }

  for (const year of ACADEMIC_YEARS) {
    for (const [level, config] of Object.entries(LEVEL_CONFIG)) {
      if ('detailFile' in config) {
        const rows = parseCsv(await fetchText(`https://stats.moe.gov.tw/files/detail/${year}/${year}_${config.detailFile}`))
        for (const row of rows) {
          addTrendValue(normalizeSchoolCode(row['學校代碼']), year, level, config.sumRow(row))
        }
        continue
      }

      for (const detailFile of config.detailFiles) {
        const rows = parseCsv(await fetchText(`https://stats.moe.gov.tw/files/detail/${year}/${year}_${detailFile.name}`))
        for (const row of rows) {
          addTrendValue(normalizeSchoolCode(row['學校代碼']), year, level, detailFile.sumRow(row))
        }
      }
    }
  }

  return trendsByCode
}

async function buildOfficialDataset() {
  const [points, directoryLookup, trendLookup] = await Promise.all([
    fetchAllSchoolPoints(),
    buildDirectoryLookup(),
    buildTrendLookup(),
  ])

  const countyMap = new Map()

  for (const feature of points) {
    const code = normalizeSchoolCode(feature.attributes['代碼'])
    const trendEntry = trendLookup.get(code)
    const level = Object.entries(LEVEL_CONFIG).find(([, config]) => config.pointLevel === feature.attributes['學校級別'])?.[0]

    if (!trendEntry || !level) {
      continue
    }

    const countyName = normalizeCountyName(feature.attributes['縣市名稱'])
    const townName = normalizeTownName(feature.attributes['鄉鎮市區'])
    const region = REGION_BY_COUNTY[countyName]

    if (!region) {
      continue
    }

    const directoryRow = directoryLookup.get(code)
    const countyId = countyName
    const townshipId = `${countyName}:${townName}`

    if (!countyMap.has(countyId)) {
      countyMap.set(countyId, {
        id: countyId,
        name: countyName,
        shortLabel: shortCountyLabel(countyName),
        region,
        towns: new Map(),
      })
    }

    const county = countyMap.get(countyId)
    if (!county.towns.has(townshipId)) {
      county.towns.set(townshipId, {
        id: townshipId,
        name: townName,
        countyId,
        schools: [],
      })
    }

    const yearlyStudents = ACADEMIC_YEARS.map((year) => ({
      year,
      students: trendEntry.yearlyStudents.get(year) ?? 0,
    }))
    const annotations = buildSchoolAnnotations(yearlyStudents)

    county.towns.get(townshipId).schools.push({
      id: code,
      code,
      name: normalizeText(feature.attributes['學校名稱']),
      countyId,
      townshipId,
      educationLevel: level,
      managementType: inferManagementType(directoryRow, normalizeText(feature.attributes['學校名稱'])),
      address: normalizeText(feature.attributes['地址'] ?? directoryRow?.['地址']),
      phone: normalizeText(feature.attributes['電話'] ?? directoryRow?.['電話']),
      website: normalizeText(feature.attributes['網址'] ?? directoryRow?.['網址']),
      profileUrl: normalizeText(feature.attributes['學校概況']),
      coordinates: {
        longitude: Number(feature.geometry.x.toFixed(6)),
        latitude: Number(feature.geometry.y.toFixed(6)),
      },
      yearlyStudents,
      status: annotations.status,
      missingYears: annotations.missingYears,
      dataNotes: annotations.dataNotes,
    })
  }

  const counties = [...countyMap.values()]
    .map((county) => {
      const towns = [...county.towns.values()]
        .map((town) => {
          const schools = town.schools.sort((left, right) => {
            const leftStudents = left.yearlyStudents.at(-1)?.students ?? 0
            const rightStudents = right.yearlyStudents.at(-1)?.students ?? 0
            return rightStudents - leftStudents
          })

          return {
            ...town,
            schools,
            dataNotes: buildScopeNotes(schools, town.name),
          }
        })
        .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'))

      const countySchools = towns.flatMap((town) => town.schools)

      return {
        id: county.id,
        name: county.name,
        shortLabel: county.shortLabel,
        region: county.region,
        towns,
        dataNotes: buildScopeNotes(countySchools, county.name),
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'))

  return {
    generatedAt: new Date().toISOString(),
    years: ACADEMIC_YEARS,
    sources: {
      points: 'https://stats.moe.gov.tw/portal/apps/experiencebuilder/experience/?id=518f8458d5fb44e288e8fe5c95457c20',
      statistics: 'https://depart.moe.gov.tw/ED4500/News_Content.aspx?n=5A930C32CC6C3818&sms=91B3AAE8C6388B96&s=33128143574210DF',
      townshipBoundaries: 'https://data.gov.tw/dataset/7441',
      countyBoundaries: 'https://data.gov.tw/dataset/7442',
    },
    summaryDataset: {
      generatedAt: new Date().toISOString(),
      years: ACADEMIC_YEARS,
      sources: {
        points: 'https://stats.moe.gov.tw/portal/apps/experiencebuilder/experience/?id=518f8458d5fb44e288e8fe5c95457c20',
        statistics: 'https://depart.moe.gov.tw/ED4500/News_Content.aspx?n=5A930C32CC6C3818&sms=91B3AAE8C6388B96&s=33128143574210DF',
        townshipBoundaries: 'https://data.gov.tw/dataset/7441',
        countyBoundaries: 'https://data.gov.tw/dataset/7442',
      },
      counties: counties.map((county) => ({
        id: county.id,
        name: county.name,
        shortLabel: county.shortLabel,
        region: county.region,
        townshipFile: `townships/${toFileSlug(county.id)}.topo.json`,
        detailFile: `counties/${toCountyDetailFile(county.id)}`,
        dataNotes: county.dataNotes,
        summaries: buildSummarySeries(county.towns.flatMap((town) => town.schools)),
        towns: county.towns.map((town) => ({
          id: town.id,
          name: town.name,
          countyId: town.countyId,
          dataNotes: town.dataNotes,
          summaries: buildSummarySeries(town.schools),
        })),
      })),
    },
    countyDetails: counties.map((county) => ({
      fileName: toCountyDetailFile(county.id),
      detail: {
        county: {
          id: county.id,
          name: county.name,
          shortLabel: county.shortLabel,
          region: county.region,
        },
        dataNotes: county.dataNotes,
        towns: county.towns,
      },
    })),
  }
}

async function buildBoundaryFiles() {
  const [countyZip, townshipZip] = await Promise.all([
    fetchArrayBufferWithFallback(COUNTY_BOUNDARY_URLS),
    fetchArrayBufferWithFallback(TOWNSHIP_BOUNDARY_URLS),
  ])

  const countyResult = await shp(countyZip)
  const townshipResult = await shp(townshipZip)

  const countyFeatures = flattenShapeResult(countyResult)
    .filter((feature) => normalizeCountyName(feature.properties.COUNTYNAME))
    .map((feature) => {
      const countyName = normalizeCountyName(feature.properties.COUNTYNAME)
      return sanitizeFeature(feature, {
        countyId: countyName,
        countyCode: String(feature.properties.COUNTYCODE ?? '').trim(),
        countyName,
        countyEng: normalizeText(feature.properties.COUNTYENG),
        shortLabel: shortCountyLabel(countyName),
        region: REGION_BY_COUNTY[countyName],
        townshipFile: `${toFileSlug(countyName)}.topo.json`,
      })
    })
    .filter((feature) => feature.properties.region)

  const townshipFeatures = flattenShapeResult(townshipResult)
    .filter((feature) => normalizeTownName(feature.properties.TOWNNAME))
    .map((feature) => {
      const countyName = normalizeCountyName(feature.properties.COUNTYNAME)
      const townName = normalizeTownName(feature.properties.TOWNNAME)
      return sanitizeFeature(feature, {
        countyId: countyName,
        countyCode: String(feature.properties.COUNTYCODE ?? '').trim(),
        countyName,
        townId: `${countyName}:${townName}`,
        townCode: String(feature.properties.TOWNCODE ?? '').trim(),
        townName,
        townEng: normalizeText(feature.properties.TOWNENG),
        region: REGION_BY_COUNTY[countyName],
      })
    })
    .filter((feature) => feature.properties.region)

  const countyBoundaries = {
    type: 'FeatureCollection',
    features: countyFeatures,
  }

  const townshipTopologyByCounty = countyFeatures.map((countyFeature) => {
    const countyId = countyFeature.properties.countyId
    const features = townshipFeatures.filter((feature) => feature.properties.countyId === countyId)

    return {
      countyId,
      fileName: countyFeature.properties.townshipFile,
      topology: topology({
        townships: {
          type: 'FeatureCollection',
          features,
        },
      }, TOPOLOGY_QUANTIZATION),
    }
  })

  return {
    countyTopology: topology({ counties: countyBoundaries }, TOPOLOGY_QUANTIZATION),
    townshipTopologyByCounty,
  }
}

async function main() {
  console.log('Refreshing official MOE and NLSC data...')
  await Promise.all([
    mkdir(DATA_DIR, { recursive: true }),
    rm(COUNTY_DETAIL_DIR, { recursive: true, force: true }),
    rm(TOWNSHIP_DIR, { recursive: true, force: true }),
    rm(path.join(DATA_DIR, 'county-boundaries.geojson'), { force: true }),
    rm(path.join(DATA_DIR, 'township-boundaries.geojson'), { force: true }),
    rm(path.join(DATA_DIR, 'education-dataset.json'), { force: true }),
  ])
  await mkdir(COUNTY_DETAIL_DIR, { recursive: true })
  await mkdir(TOWNSHIP_DIR, { recursive: true })

  const [datasetBundle, boundaries] = await Promise.all([buildOfficialDataset(), buildBoundaryFiles()])

  const countyDetailBytes = datasetBundle.countyDetails.reduce((sum, entry) => sum + measurePrettyJsonBytes(entry.detail), 0)
  const townshipBoundaryBytes = boundaries.townshipTopologyByCounty.reduce(
    (sum, entry) => sum + measurePrettyJsonBytes(entry.topology),
    0,
  )
  const countyDetailSizeMap = new Map(
    datasetBundle.countyDetails.map((entry) => [entry.detail.county.id, measurePrettyJsonBytes(entry.detail)]),
  )
  const townshipBoundarySizeMap = new Map(
    boundaries.townshipTopologyByCounty.map((entry) => [entry.countyId, measurePrettyJsonBytes(entry.topology)]),
  )

  datasetBundle.summaryDataset.counties = datasetBundle.summaryDataset.counties.map((county) => ({
    ...county,
    assetMetrics: {
      detailBytes: countyDetailSizeMap.get(county.id) ?? 0,
      townshipBytes: townshipBoundarySizeMap.get(county.id) ?? 0,
    },
  }))

  datasetBundle.summaryDataset.assetMetrics = {
    summaryBytes: measurePrettyJsonBytes(datasetBundle.summaryDataset),
    countyBoundaryBytes: measurePrettyJsonBytes(boundaries.countyTopology),
    countyDetailBytes,
    townshipBoundaryBytes,
  }

  await Promise.all([
    writePrettyJson(path.join(DATA_DIR, 'education-summary.json'), datasetBundle.summaryDataset),
    writePrettyJson(path.join(DATA_DIR, 'county-boundaries.topo.json'), boundaries.countyTopology),
    ...datasetBundle.countyDetails.map((entry) => writePrettyJson(path.join(COUNTY_DETAIL_DIR, entry.fileName), entry.detail)),
    ...boundaries.townshipTopologyByCounty.map((entry) =>
      writePrettyJson(path.join(TOWNSHIP_DIR, entry.fileName), entry.topology),
    ),
  ])

  console.log(`Wrote ${datasetBundle.summaryDataset.counties.length} counties to ${DATA_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})