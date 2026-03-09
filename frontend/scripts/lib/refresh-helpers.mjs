import { writeFile } from 'node:fs/promises'

import { parse } from 'csv-parse/sync'

export const CURRENT_YEAR = 114
export const ACADEMIC_YEARS = [107, 108, 109, 110, 111, 112, 113, 114]
export const SUMMARY_EDUCATION_LEVELS = ['全部', '國小', '國中', '高中職', '大專院校']
export const SUMMARY_MANAGEMENT_TYPES = ['全部', '公立', '私立']
export const REGION_BY_COUNTY = {
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
export const LEVEL_CONFIG = {
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
      { name: 'student.csv', sumRow: (row) => number(row['總計']) },
      { name: 'highera1.csv', sumRow: (row) => number(row['二專學生數']) + number(row['二技(大學)學生數']) },
      { name: 'higherr.csv', sumRow: (row) => number(row['學生數學士']) + number(row['學生數碩士']) + number(row['學生數博士']) },
    ],
  },
}

export function number(value) {
  if (value == null) return 0
  const normalized = String(value).replace(/,/g, '').trim()
  if (!normalized) return 0
  return Number.parseInt(normalized, 10) || 0
}

export function normalizeText(value) {
  return String(value ?? '')
    .replace(/^\ufeff/, '')
    .replace(/^\[[^\]]+\]/, '')
    .replace(/^\d+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/台/g, '臺')
    .trim()
}

export function normalizeCountyName(value) {
  return normalizeText(value)
}

export function normalizeTownName(value) {
  return normalizeText(value)
}

export function normalizeSchoolCode(value) {
  return String(value ?? '').replace(/^\ufeff/, '').trim()
}

export function shortCountyLabel(countyName) {
  if (countyName === '新北市') return '新北'
  if (countyName === '新竹市') return '竹市'
  if (countyName === '新竹縣') return '竹縣'
  if (countyName === '嘉義市') return '嘉市'
  if (countyName === '嘉義縣') return '嘉縣'
  return countyName.replace(/縣|市/g, '')
}

export function toCountyDetailFile(countyId) {
  return `${countyId}.json`
}

export function toCountyBucketFile(countyId) {
  return `${countyId}.json`
}

export function summaryBucketKey(educationLevel, managementType) {
  return `${educationLevel}|${managementType}`
}

export function parseCsv(text) {
  return parse(text, {
    bom: true,
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  })
}

function wait(milliseconds) {
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

      if (responseType === 'json') return response.json()
      if (responseType === 'arrayBuffer') return response.arrayBuffer()
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

export async function fetchText(url) {
  return fetchWithRetry(url, 'text')
}

export async function fetchJson(url) {
  return fetchWithRetry(url, 'json')
}

export async function fetchArrayBufferWithFallback(urls) {
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

export function flattenShapeResult(shapeResult) {
  if (shapeResult.type === 'FeatureCollection') return shapeResult.features
  if (Array.isArray(shapeResult)) return shapeResult.flatMap((item) => flattenShapeResult(item))
  return []
}

function roundCoordinates(value) {
  if (Array.isArray(value)) return value.map(roundCoordinates)
  if (typeof value === 'number') return Number(value.toFixed(6))
  return value
}

export function sanitizeFeature(feature, properties) {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: feature.geometry.type,
      coordinates: roundCoordinates(feature.geometry.coordinates),
    },
  }
}

export async function writePrettyJson(filePath, value) {
  await writeFile(filePath, JSON.stringify(value, null, 2) + '\n')
}

export function measurePrettyJsonBytes(value) {
  return new TextEncoder().encode(JSON.stringify(value, null, 2) + '\n').length
}