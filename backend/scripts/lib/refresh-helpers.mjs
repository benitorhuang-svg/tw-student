import { writeFile } from 'node:fs/promises'

import * as XLSX from 'xlsx'

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

function toBandRecord(id, label, category, maleStudents, femaleStudents, totalStudents = null) {
  const resolvedTotalStudents = totalStudents ?? ((maleStudents ?? 0) + (femaleStudents ?? 0))
  return {
    id,
    label,
    category,
    totalStudents: resolvedTotalStudents,
    ...(maleStudents != null ? { maleStudents } : {}),
    ...(femaleStudents != null ? { femaleStudents } : {}),
  }
}

function toCompositionRecord(maleStudents, femaleStudents, bands = [], totalStudents = null) {
  const resolvedTotalStudents = totalStudents ?? ((maleStudents ?? 0) + (femaleStudents ?? 0))
  return {
    totalStudents: resolvedTotalStudents,
    ...(maleStudents != null ? { maleStudents } : {}),
    ...(femaleStudents != null ? { femaleStudents } : {}),
    bands,
  }
}

function buildElementaryComposition(row) {
  const grades = [
    ['grade-1', '1年級', number(row['1年級男學生數']), number(row['1年級女學生數'])],
    ['grade-2', '2年級', number(row['2年級男學生數']), number(row['2年級女學生數'])],
    ['grade-3', '3年級', number(row['3年級男學生數']), number(row['3年級女學生數'])],
    ['grade-4', '4年級', number(row['4年級男學生數']), number(row['4年級女學生數'])],
    ['grade-5', '5年級', number(row['5年級男學生數']), number(row['5年級女學生數'])],
    ['grade-6', '6年級', number(row['6年級男學生數']), number(row['6年級女學生數'])],
  ]
  const maleStudents = grades.reduce((sum, [, , male]) => sum + male, 0)
  const femaleStudents = grades.reduce((sum, [, , , female]) => sum + female, 0)
  return toCompositionRecord(
    maleStudents,
    femaleStudents,
    grades.map(([id, label, male, female]) => toBandRecord(id, label, 'grade', male, female)),
  )
}

function buildJuniorComposition(row) {
  const grades = [
    ['grade-7', '7年級', number(row['學生數7年級男']), number(row['學生數7年級女'])],
    ['grade-8', '8年級', number(row['學生數8年級男']), number(row['學生數8年級女'])],
    ['grade-9', '9年級', number(row['學生數9年級男']), number(row['學生數9年級女'])],
  ]
  const maleStudents = grades.reduce((sum, [, , male]) => sum + male, 0)
  const femaleStudents = grades.reduce((sum, [, , , female]) => sum + female, 0)
  return toCompositionRecord(
    maleStudents,
    femaleStudents,
    grades.map(([id, label, male, female]) => toBandRecord(id, label, 'grade', male, female)),
  )
}

function buildHighComposition(row) {
  const maleStudents = number(row['學生數男'])
  const femaleStudents = number(row['學生數女'])
  return toCompositionRecord(maleStudents, femaleStudents, [])
}

function normalizeHigherLabel(value) {
  return normalizeText(value).replace(/^[A-Z0-9]+\s*/, '')
}

function buildHigherStudentComposition(row) {
  const maleStudents = number(row['男生計'])
  const femaleStudents = number(row['女生計'])
  const trackLabel = normalizeHigherLabel(row['日間∕進修別'])
  const degreeLabel = normalizeHigherLabel(row['等級別'])
  const label = [trackLabel, degreeLabel].filter(Boolean).join(' ')
  return toCompositionRecord(
    maleStudents,
    femaleStudents,
    [toBandRecord(`${trackLabel || 'track'}-${degreeLabel || 'degree'}`, label || '學制總計', 'degree', maleStudents, femaleStudents)],
    number(row['總計']),
  )
}

function buildHighera1Composition(row) {
  const shortCollegeStudents = number(row['二專學生數'])
  const twoYearTechStudents = number(row['二技(大學)學生數'])
  return toCompositionRecord(
    undefined,
    undefined,
    [
      toBandRecord('degree-2y-college', '二專', 'degree', undefined, undefined, shortCollegeStudents),
      toBandRecord('degree-2y-tech', '二技(大學)', 'degree', undefined, undefined, twoYearTechStudents),
    ],
    shortCollegeStudents + twoYearTechStudents,
  )
}

function buildHigherrComposition(row) {
  const bachelorStudents = number(row['學生數學士'])
  const masterStudents = number(row['學生數碩士'])
  const doctoralStudents = number(row['學生數博士'])
  return toCompositionRecord(
    undefined,
    undefined,
    [
      toBandRecord('degree-bachelor', '學士', 'degree', undefined, undefined, bachelorStudents),
      toBandRecord('degree-master', '碩士', 'degree', undefined, undefined, masterStudents),
      toBandRecord('degree-doctoral', '博士', 'degree', undefined, undefined, doctoralStudents),
    ],
    bachelorStudents + masterStudents + doctoralStudents,
  )
}

export const LEVEL_CONFIG = {
  國小: {
    pointLevel: '國民小學',
    directoryFiles: ['e1_new'],
    detailFile: 'basec',
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
    breakdownRow: buildElementaryComposition,
  },
  國中: {
    pointLevel: '國民中學',
    directoryFiles: ['j1_new'],
    detailFile: 'basej',
    sumRow: (row) =>
      number(row['學生數7年級男']) +
      number(row['學生數7年級女']) +
      number(row['學生數8年級男']) +
      number(row['學生數8年級女']) +
      number(row['學生數9年級男']) +
      number(row['學生數9年級女']),
    breakdownRow: buildJuniorComposition,
  },
  高中職: {
    pointLevel: '高級中等學校',
    directoryFiles: ['high'],
    detailFile: 'base0',
    sumRow: (row) => number(row['學生數男']) + number(row['學生數女']),
    breakdownRow: buildHighComposition,
  },
  大專院校: {
    pointLevel: '大專校院',
    directoryFiles: ['u1_new', 'u2_new', 'u3_new'],
    detailFiles: [
      { name: 'student', sumRow: (row) => number(row['總計']), breakdownRow: buildHigherStudentComposition },
      { name: 'highera', sumRow: (row) => number(row['二專學生數']) + number(row['二技(大學)學生數']), breakdownRow: buildHighera1Composition },
      { name: 'higherr', sumRow: (row) => number(row['學生數學士']) + number(row['學生數碩士']) + number(row['學生數博士']), breakdownRow: buildHigherrComposition },
    ],
  },
}

export function number(value) {
  if (value == null) return 0
  const normalized = String(value)
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '')
    .trim()
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

function normalizeWorkbookCell(value) {
  return String(value ?? '').replace(/\r?\n/g, '').trim()
}

function hasWorkbookRowData(row) {
  return row.some((value) => normalizeWorkbookCell(value) !== '')
}

function isWorkbookSchoolCode(value) {
  return /^[0-9A-Z]{4,10}$/i.test(normalizeWorkbookCell(value))
}

function toWorkbookObjects(rows, headers, startIndex) {
  return rows
    .slice(startIndex)
    .filter(hasWorkbookRowData)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
}

function findHeaderRowIndex(rows, requiredHeaders) {
  return rows.findIndex((row) => requiredHeaders.every((header) => row.some((value) => normalizeWorkbookCell(value) === header)))
}

function parseSimpleWorkbookRows(rows, requiredHeaders, aliases = {}) {
  const headerRowIndex = rows.findIndex((row) => {
    const normalizedRow = row.map((value) => aliases[normalizeWorkbookCell(value)] ?? normalizeWorkbookCell(value))
    return requiredHeaders.every((header) => normalizedRow.includes(header))
  })
  if (headerRowIndex < 0) {
    throw new Error(`Unable to locate workbook header row: ${requiredHeaders.join(', ')}`)
  }

  const headers = rows[headerRowIndex].map((value) => {
    const normalized = normalizeWorkbookCell(value)
    return aliases[normalized] ?? normalized
  })

  return toWorkbookObjects(rows, headers, headerRowIndex + 1)
}

function combineWorkbookHeaders(primaryRow, secondaryRow) {
  let lastPrimary = ''

  return primaryRow.map((value, index) => {
    const normalizedPrimary = normalizeWorkbookCell(value)
    if (normalizedPrimary) {
      lastPrimary = normalizedPrimary
    }

    const primary = normalizedPrimary || lastPrimary
    const secondary = normalizeWorkbookCell(secondaryRow[index])

    if (primary === '學生數' && secondary === '男') return '學生數男'
    if (primary === '學生數' && secondary === '女') return '學生數女'
    if (primary === '學生數' && secondary === '總計') return '學生數總計'

    if (!primary) return secondary
    if (!secondary) return primary
    return `${primary}${secondary}`
  })
}

function parseBase0WorkbookRows(rows) {
  const headerRowIndex = rows.findIndex((row, index) => {
    const nextRow = rows[index + 1] ?? []
    return row.some((value) => normalizeWorkbookCell(value) === '學校代碼')
      && row.some((value) => normalizeWorkbookCell(value) === '學生數')
      && nextRow.some((value) => normalizeWorkbookCell(value) === '男')
  })

  if (headerRowIndex >= 0) {
    const headers = combineWorkbookHeaders(rows[headerRowIndex], rows[headerRowIndex + 1] ?? [])
    return toWorkbookObjects(rows, headers, headerRowIndex + 2)
  }

  const legacyHeaderRowIndex = rows.findIndex((row, index) => {
    const nextRow = rows[index + 1] ?? []
    return normalizeWorkbookCell(row[14]) === '學生數' && normalizeWorkbookCell(nextRow[14]) === '總計'
  })

  if (legacyHeaderRowIndex < 0) {
    throw new Error('Unable to locate workbook multi-row header for base0')
  }

  return rows
    .slice(legacyHeaderRowIndex + 2)
    .filter((row) => hasWorkbookRowData(row) && isWorkbookSchoolCode(row[0]))
    .map((row) => ({
      學校代碼: row[0] ?? '',
      學校名稱: row[1] ?? '',
      縣市名稱: row[3] ?? '',
      學生數男: row[15] ?? '',
      學生數女: row[16] ?? '',
    }))
}

function parseHigheraWorkbookRows(rows) {
  const simpleHeaderRowIndex = rows.findIndex((row) => row.some((value) => normalizeWorkbookCell(value) === '二專學生數'))
  if (simpleHeaderRowIndex >= 0) {
    return parseSimpleWorkbookRows(rows, ['學校代碼', '學校名稱', '二專學生數'])
  }

  const fixedHeaderRowIndex = rows.findIndex((row) => normalizeWorkbookCell(row[16]) === '二專' && normalizeWorkbookCell(row[17]).startsWith('二技'))
  if (fixedHeaderRowIndex < 0) {
    throw new Error('Unable to locate workbook header row for highera')
  }

  return rows
    .slice(fixedHeaderRowIndex + 1)
    .filter((row) => hasWorkbookRowData(row) && isWorkbookSchoolCode(row[0]))
    .map((row) => ({
      學校代碼: row[0] ?? '',
      學校名稱: row[1] ?? '',
      二專學生數: row[16] ?? '',
      '二技(大學)學生數': row[17] ?? '',
    }))
}

function parseHigherrWorkbookRows(rows) {
  const simpleHeaderRowIndex = rows.findIndex((row) => row.some((value) => normalizeWorkbookCell(value) === '學生數學士'))
  if (simpleHeaderRowIndex >= 0) {
    return parseSimpleWorkbookRows(rows, ['學校代碼', '學校名稱', '學生數學士'])
  }

  const fixedHeaderRowIndex = rows.findIndex((row) => normalizeWorkbookCell(row[10]) === '學士' && normalizeWorkbookCell(row[11]) === '碩士' && normalizeWorkbookCell(row[12]) === '博士')
  if (fixedHeaderRowIndex < 0) {
    throw new Error('Unable to locate workbook header row for higherr')
  }

  return rows
    .slice(fixedHeaderRowIndex + 1)
    .filter((row) => hasWorkbookRowData(row) && isWorkbookSchoolCode(row[0]))
    .map((row) => ({
      學校代碼: row[0] ?? '',
      學校名稱: row[1] ?? '',
      學生數學士: row[10] ?? '',
      學生數碩士: row[11] ?? '',
      學生數博士: row[12] ?? '',
    }))
}

export function parseOfficialWorkbook(arrayBuffer, parserKey) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  })

  switch (parserKey) {
    case 'student':
      return parseSimpleWorkbookRows(rows, ['學校代碼', '學校名稱', '總計'])
    case 'highera':
    case 'highera1':
      return parseHigheraWorkbookRows(rows)
    case 'basec':
      return parseSimpleWorkbookRows(rows, ['學校代碼', '學校名稱', '1年級男學生數'], {
        '1年級男': '1年級男學生數',
        '1年級女': '1年級女學生數',
        '2年級男': '2年級男學生數',
        '2年級女': '2年級女學生數',
        '3年級男': '3年級男學生數',
        '3年級女': '3年級女學生數',
        '4年級男': '4年級男學生數',
        '4年級女': '4年級女學生數',
        '5年級男': '5年級男學生數',
        '5年級女': '5年級女學生數',
        '6年級男': '6年級男學生數',
        '6年級女': '6年級女學生數',
      })
    case 'basej':
      return parseSimpleWorkbookRows(rows, ['學校代碼', '學校名稱', '學生數7年級男'], {
        '7年級男': '學生數7年級男',
        '7年級女': '學生數7年級女',
        '8年級男': '學生數8年級男',
        '8年級女': '學生數8年級女',
        '9年級男': '學生數9年級男',
        '9年級女': '學生數9年級女',
      })
    case 'base0':
      return parseBase0WorkbookRows(rows)
    case 'higherr':
      return parseHigherrWorkbookRows(rows)
    case 'e1_new':
    case 'j1_new':
    case 'high':
    case 'u1_new':
    case 'u2_new':
    case 'u3_new':
      return parseSimpleWorkbookRows(rows, ['代碼', '學校名稱'])
    default:
      throw new Error(`Unsupported workbook parser: ${parserKey}`)
  }
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
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        }
      })
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

export async function fetchArrayBuffer(url) {
  return fetchWithRetry(url, 'arrayBuffer')
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