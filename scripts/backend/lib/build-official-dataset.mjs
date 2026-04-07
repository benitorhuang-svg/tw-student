import {
  ACADEMIC_YEARS,
  CURRENT_YEAR,
  LEVEL_CONFIG,
  REGION_BY_COUNTY,
  SUMMARY_EDUCATION_LEVELS,
  SUMMARY_MANAGEMENT_TYPES,
  fetchArrayBuffer,
  fetchJson,
  normalizeCountyName,
  normalizeSchoolCode,
  normalizeText,
  normalizeTownName,
  parseOfficialWorkbook,
  shortCountyLabel,
  summaryBucketKey,
  toCountyBucketFile,
  toCountyDetailFile,
} from './refresh-helpers.mjs'
import { buildCountyBucketSlice } from './build-county-buckets.mjs'

const MANUAL_COORDINATE_OVERRIDES = {
  '011314': {
    longitude: 121.437438,
    latitude: 24.975626,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依公開校址人工覆核校正。',
    matchType: 'manual-reviewed-address',
    matchScore: 100,
  },
  '013501': {
    longitude: 121.360219,
    latitude: 25.07294,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依學校官網公開校址人工覆核校正。',
    matchType: 'manual-reviewed-address',
    matchScore: 98.9,
  },
  '031301': {
    longitude: 121.244791,
    latitude: 24.847446,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依公開校名 POI 人工覆核校正。',
    matchType: 'manual-reviewed-poi',
    matchScore: 100,
  },
  '07C301': {
    longitude: 120.60514,
    latitude: 23.876389,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依公開校址人工覆核校正。',
    matchType: 'manual-reviewed-address',
    matchScore: 82.22,
  },
  '084703': {
    longitude: 120.865995,
    latitude: 23.928052,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依公開校址人工覆核校正。',
    matchType: 'manual-reviewed-address',
    matchScore: 98.33,
  },
  '121502': {
    longitude: 120.4271,
    latitude: 22.608,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依公開校名 POI 人工覆核校正。',
    matchType: 'manual-reviewed-poi',
    matchScore: 100,
  },
  '113502': {
    longitude: 120.308156,
    latitude: 23.116287,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依學校官網公開校址人工覆核校正。',
    matchType: 'manual-reviewed-address',
    matchScore: 98.24,
  },
  193667: {
    longitude: 120.691423,
    latitude: 24.186995,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依校址人工覆核校正。',
    matchType: 'manual-review',
    matchScore: 100,
  },
  '311601': {
    longitude: 121.553726,
    latitude: 25.049817,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已比對同校高國中部既有 GIS 點位人工覆核校正。',
    matchType: 'related-school-point',
    matchScore: 100,
  },
  '331601': {
    longitude: 121.54821,
    latitude: 25.039557,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已比對同校高國中部既有 GIS 點位人工覆核校正。',
    matchType: 'related-school-point',
    matchScore: 100,
  },
  '381601': {
    longitude: 121.546564,
    latitude: 24.998751,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已比對同校高國中部既有 GIS 點位人工覆核校正。',
    matchType: 'related-school-point',
    matchScore: 100,
  },
  '400144': {
    longitude: 121.586891,
    latitude: 25.082367,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已比對校本部既有點位人工覆核校正。',
    matchType: 'related-school-point',
    matchScore: 100,
  },
  '411601': {
    longitude: 121.537966,
    latitude: 25.105746,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已比對同校高國中部既有 GIS 點位人工覆核校正。',
    matchType: 'related-school-point',
    matchScore: 100,
  },
  '551303': {
    longitude: 120.326031,
    latitude: 22.673152,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依公開校名 POI 人工覆核校正。',
    matchType: 'manual-reviewed-poi',
    matchScore: 100,
  },
}

const GEOCODER_ACCEPTED_TYPES = new Set(['PointAddress', 'StreetAddress', 'StreetAddressExt', 'StreetName', 'POI'])

function normalizeAddressForGeocoding(address) {
  return normalizeText(address)
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .trim()
}

function buildCoordinateResult(candidate, resolution, note) {
  return {
    longitude: Number(candidate.location.x.toFixed(6)),
    latitude: Number(candidate.location.y.toFixed(6)),
    resolution,
    note,
    matchType: candidate.attributes?.Addr_type ?? '',
    matchScore: Number(candidate.score ?? 0),
  }
}

function getAcceptedCandidate(response, minimumScore = 80) {
  const candidate = response?.candidates?.[0]
  if (!candidate) {
    return null
  }

  const matchType = candidate.attributes?.Addr_type ?? ''
  const matchScore = Number(candidate.score ?? 0)
  if (!GEOCODER_ACCEPTED_TYPES.has(matchType) || matchScore < minimumScore) {
    return null
  }

  return candidate
}

async function resolveMissingSchoolCoordinate({ code, schoolName, countyName, townName, address }) {
  const manualOverride = MANUAL_COORDINATE_OVERRIDES[code]
  if (manualOverride) {
    return manualOverride
  }

  const normalizedAddress = normalizeAddressForGeocoding(address)

  try {
    if (normalizedAddress) {
      const addressQuery = new URLSearchParams({
        f: 'pjson',
        singleLine: normalizedAddress,
        countryCode: 'TWN',
        maxLocations: '1',
        outFields: 'Match_addr,Addr_type,Score',
      })

      const addressResponse = await fetchJson(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${addressQuery.toString()}`)
      const addressCandidate = getAcceptedCandidate(addressResponse, 80)
      if (addressCandidate) {
        return buildCoordinateResult(
          addressCandidate,
          addressCandidate.attributes?.Addr_type === 'StreetName' ? '地址解點' : '地址解點',
          addressCandidate.attributes?.Addr_type === 'StreetName'
            ? '正式統計資料存在但 GIS 點位缺失，座標改採校址街道解點。'
            : '正式統計資料存在但 GIS 點位缺失，座標改採校址解點。',
        )
      }
    }

    const schoolQueryText = normalizeText(`${countyName}${townName}${schoolName}`).replace(/\s+/g, '')
    if (!schoolQueryText) {
      return null
    }

    const schoolQuery = new URLSearchParams({
      f: 'pjson',
      singleLine: schoolQueryText,
      countryCode: 'TWN',
      category: 'Education',
      maxLocations: '1',
      outFields: 'Match_addr,Addr_type,Score',
    })

    const schoolResponse = await fetchJson(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${schoolQuery.toString()}`)
    const schoolCandidate = getAcceptedCandidate(schoolResponse, 85)
    if (!schoolCandidate) {
      return null
    }

    return buildCoordinateResult(
      schoolCandidate,
      '地址解點',
      '正式統計資料存在但 GIS 點位缺失，座標改採學校名稱與行政區 POI 解點。',
    )
  } catch (error) {
    console.warn(`Failed to geocode missing school ${code}: ${normalizedAddress || schoolName}`)
    console.warn(error)
    return null
  }
}

async function fetchYearBinaryWithFallback(urlBuilder, requestedYear) {
  let lastError = null

  for (let sourceYear = requestedYear; sourceYear >= ACADEMIC_YEARS[0]; sourceYear -= 1) {
    try {
      const buffer = await fetchArrayBuffer(urlBuilder(sourceYear))
      if (sourceYear !== requestedYear) {
        console.warn(`Fallback to ${sourceYear} for ${requestedYear}: ${urlBuilder(sourceYear)}`)
      }
      return { buffer, sourceYear }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error(`Unable to fetch source for ${requestedYear}`)
}

function buildWorkbookCandidates(baseUrl, sourceYear, parserKey, fileNameBuilder = (year, key, extension) => `${year}_${key}.${extension}`) {
  return [
    {
      fileName: `${parserKey}.xls`,
      read: () => fetchArrayBuffer(`${baseUrl}/${fileNameBuilder(sourceYear, parserKey, 'xls')}`),
    },
    {
      fileName: `${parserKey}.xlsx`,
      read: () => fetchArrayBuffer(`${baseUrl}/${fileNameBuilder(sourceYear, parserKey, 'xlsx')}`),
    },
  ]
}

async function fetchDetailRowsWithFallback(fileName, requestedYear) {
  const parserKey = fileName.replace(/\.(xls|xlsx)$/i, '')
  let lastError = null

  for (let sourceYear = requestedYear; sourceYear >= ACADEMIC_YEARS[0]; sourceYear -= 1) {
    const candidates = buildWorkbookCandidates(
      'https://stats.moe.gov.tw/files/detail',
      sourceYear,
      parserKey,
      (year, key, extension) => `${year}/${year}_${key}.${extension}`,
    )
      .map((candidate) => ({
        ...candidate,
        parse: (payload) => parseOfficialWorkbook(payload, parserKey),
      }))

    for (const candidate of candidates) {
      try {
        const payload = await candidate.read()
        return {
          rows: candidate.parse(payload),
          sourceYear,
          sourceFile: candidate.fileName,
        }
      } catch (error) {
        lastError = error
      }
    }
  }

  throw lastError ?? new Error(`Unable to fetch detail source for ${requestedYear}: ${fileName}`)
}

function getMissingYears(yearlyStudents) {
  const observedYears = yearlyStudents.filter((entry) => entry.students > 0).map((entry) => entry.year)

  if (observedYears.length < 2) {
    return []
  }

  const firstObservedYear = Math.min(...observedYears)
  const lastObservedYear = Math.max(...observedYears)

  return ACADEMIC_YEARS.filter((year) => {
    if (year <= firstObservedYear || year >= lastObservedYear) {
      return false
    }

    return !yearlyStudents.some((entry) => entry.year === year && entry.students > 0)
  })
}

function buildSchoolAnnotations(yearlyStudents) {
  const missingYears = getMissingYears(yearlyStudents)
  const latestStudents = yearlyStudents.at(-1)?.students ?? 0
  const historicalStudents = yearlyStudents.slice(0, -1).some((entry) => entry.students > 0)
  const dataNotes = []
  let status = '正常'

  if (missingYears.length > 0) {
    dataNotes.push({ type: '缺年度', message: `正式資料序列存在中段缺口：${missingYears.join('、')}`, severity: 'warning', years: missingYears })
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

  return { missingYears, dataNotes, status }
}

function buildScopeNotes(schools, scopeName) {
  const schoolsWithMissingYears = schools.filter((school) => (school.missingYears?.length ?? 0) > 0)
  const schoolsPendingVerification = schools.filter((school) => school.status === '待確認')
  const dataNotes = []

  if (schoolsWithMissingYears.length > 0) {
    dataNotes.push({ type: '缺年度', message: `${scopeName} 有 ${schoolsWithMissingYears.length} 所學校存在年度缺漏。`, severity: 'warning' })
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

function buildDatasetNotes(fallbackEntries) {
  if (fallbackEntries.length === 0) {
    return []
  }

  const byYear = new Map()
  fallbackEntries.forEach(({ requestedYear, level, fileName, sourceYear }) => {
    if (!byYear.has(requestedYear)) {
      byYear.set(requestedYear, new Map())
    }

    const yearEntries = byYear.get(requestedYear)
    if (!yearEntries.has(level)) {
      yearEntries.set(level, { sourceYears: new Set(), files: new Set() })
    }

    const levelEntry = yearEntries.get(level)
    levelEntry.sourceYears.add(sourceYear)
    levelEntry.files.add(fileName)
  })

  return [...byYear.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([year, levelEntries]) => {
      const levelSummary = [...levelEntries.entries()]
        .sort(([leftLevel], [rightLevel]) => SUMMARY_EDUCATION_LEVELS.indexOf(leftLevel) - SUMMARY_EDUCATION_LEVELS.indexOf(rightLevel))
        .map(([level, entry]) => {
          const files = [...entry.files].sort().join('、')
          const sourceYears = [...entry.sourceYears].sort((left, right) => right - left).join('、')
          return `${level}（${files} 沿用 ${sourceYears} 學年）`
        })
        .join('、')

      return {
        type: '其他',
        message: `${year} 學年度部分正式靜態檔尚未發布：${levelSummary}。因此這些學制目前會沿用前一年已發布的正式數列，畫面上的 ${year} 學年總數可能與前一年相同。`,
        severity: 'warning',
        years: [year],
      }
    })
}

function getStudentsForYear(school, year) {
  return school.yearlyStudents.find((entry) => entry.year === year)?.students ?? 0
}

function toCountySchoolAtlasFile(countyId) {
  return `school-atlas/${countyId}.json`
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

function mergeCount(left, right) {
  if (left == null && right == null) return undefined
  return (left ?? 0) + (right ?? 0)
}

function mergeBands(existingBands = [], nextBands = []) {
  const mergedBands = new Map()
  for (const band of [...existingBands, ...nextBands]) {
    const key = `${band.category}:${band.id}`
    if (!mergedBands.has(key)) {
      mergedBands.set(key, { ...band })
      continue
    }

    const entry = mergedBands.get(key)
    entry.totalStudents += band.totalStudents ?? 0
    entry.maleStudents = mergeCount(entry.maleStudents, band.maleStudents)
    entry.femaleStudents = mergeCount(entry.femaleStudents, band.femaleStudents)
  }

  return [...mergedBands.values()]
}

function mergeComposition(existingComposition, nextComposition) {
  if (!existingComposition) return nextComposition
  if (!nextComposition) return existingComposition

  return {
    totalStudents: (existingComposition.totalStudents ?? 0) + (nextComposition.totalStudents ?? 0),
    maleStudents: mergeCount(existingComposition.maleStudents, nextComposition.maleStudents),
    femaleStudents: mergeCount(existingComposition.femaleStudents, nextComposition.femaleStudents),
    bands: mergeBands(existingComposition.bands, nextComposition.bands),
  }
}

function buildYearlyCompositions(entry) {
  return ACADEMIC_YEARS.map((year) => {
    const composition = entry.yearlyCompositions.get(year)
    if (composition) {
      return { year, ...composition }
    }

    return {
      year,
      totalStudents: entry.yearlyStudents.get(year) ?? 0,
      bands: [],
    }
  })
}

async function fetchAllSchoolPoints() {
  let lastError = null

  for (let sourceYear = CURRENT_YEAR; sourceYear >= ACADEMIC_YEARS[0]; sourceYear -= 1) {
    try {
      const baseUrl = `https://stats.moe.gov.tw/server/rest/services/Hosted/${sourceYear}學年各級學校名錄點位/FeatureServer/0`
      const pointLayer = await fetchJson(`${baseUrl}?f=pjson`)
      if (!pointLayer || typeof pointLayer !== 'object' || !Number(pointLayer.maxRecordCount)) {
        throw new Error(`Point layer metadata unavailable for ${sourceYear}`)
      }

      const allFeatures = []
      let offset = 0
      const pageSize = Number(pointLayer.maxRecordCount) > 0 ? Number(pointLayer.maxRecordCount) : 1000

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

        const result = await fetchJson(`${baseUrl}/query?${query.toString()}`)
        if (!Array.isArray(result.features)) {
          throw new Error(`Point layer query unavailable for ${sourceYear}`)
        }

        allFeatures.push(...result.features)

        if (!result.exceededTransferLimit || result.features.length < pageSize) break
        offset += pageSize
      }

      if (sourceYear !== CURRENT_YEAR) {
        console.warn(`Fallback to ${sourceYear} point layer for ${CURRENT_YEAR}`)
      }

      return allFeatures
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error('Unable to fetch school point layer')
}

function inferManagementType(directoryRow, schoolName) {
  if (directoryRow?.['公/私立']) return normalizeText(directoryRow['公/私立'])
  return schoolName.includes('私立') ? '私立' : '公立'
}

async function buildDirectoryLookup() {
  const lookup = new Map()
  for (const config of Object.values(LEVEL_CONFIG)) {
    for (const parserKey of config.directoryFiles) {
      let buffer = null
      let lastError = null

      for (let sourceYear = CURRENT_YEAR; sourceYear >= ACADEMIC_YEARS[0]; sourceYear -= 1) {
        const candidates = buildWorkbookCandidates(
          'https://stats.moe.gov.tw/files/school',
          sourceYear,
          parserKey,
          (year, key, extension) => `${year}/${key}.${extension}`,
        )

        for (const candidate of candidates) {
          try {
            buffer = await candidate.read()
            if (sourceYear !== CURRENT_YEAR) {
              console.warn(`Fallback to ${sourceYear} for ${CURRENT_YEAR}: ${candidate.fileName}`)
            }
            break
          } catch (error) {
            lastError = error
          }
        }

        if (buffer) {
          break
        }
      }

      if (!buffer) {
        throw lastError ?? new Error(`Unable to fetch workbook for ${parserKey}`)
      }

      const rows = parseOfficialWorkbook(buffer, parserKey)
      rows.forEach((row) => {
        lookup.set(normalizeSchoolCode(row['代碼']), row)
      })
    }
  }
  return lookup
}

async function buildTrendLookup() {
  // Key by code:level so 完全中學 (schools spanning multiple levels)
  // keep each level's students separate instead of accumulating them.
  const trendsByCode = new Map()
  const fallbackEntries = []

  const recordFallback = (requestedYear, level, fileName, sourceYear) => {
    if (requestedYear === sourceYear) {
      return
    }

    fallbackEntries.push({ requestedYear, level, fileName, sourceYear })
  }

  const addTrendValue = (code, year, level, students, scope = {}) => {
    if (!code || students <= 0) return
    const key = `${code}:${level}`
    if (!trendsByCode.has(key)) {
      trendsByCode.set(key, {
        code,
        level,
        yearlyStudents: new Map(),
        yearlyCompositions: new Map(),
        countyName: '',
        townName: '',
        schoolName: '',
      })
    }

    const entry = trendsByCode.get(key)
    if (!entry.countyName && scope.countyName) {
      entry.countyName = normalizeCountyName(scope.countyName)
    }
    if (!entry.townName && scope.townName) {
      entry.townName = normalizeTownName(scope.townName)
    }
    if (!entry.schoolName && scope.schoolName) {
      entry.schoolName = normalizeText(scope.schoolName)
    }
    entry.yearlyStudents.set(year, students + (entry.yearlyStudents.get(year) ?? 0))
    if (scope.composition) {
      entry.yearlyCompositions.set(year, mergeComposition(entry.yearlyCompositions.get(year), scope.composition))
    }
  }

  for (const year of ACADEMIC_YEARS) {
    for (const [level, config] of Object.entries(LEVEL_CONFIG)) {
      if ('detailFile' in config) {
        const { rows, sourceYear, sourceFile } = await fetchDetailRowsWithFallback(config.detailFile, year)
        recordFallback(year, level, sourceFile, sourceYear)
        rows.forEach((row) => addTrendValue(normalizeSchoolCode(row['學校代碼']), year, level, config.sumRow(row), {
          countyName: row['縣市名稱'],
          townName: row['鄉鎮市區'],
          schoolName: row['學校名稱'],
          composition: config.breakdownRow?.(row),
        }))
        continue
      }

      for (const detailFile of config.detailFiles) {
        const { rows, sourceYear, sourceFile } = await fetchDetailRowsWithFallback(detailFile.name, year)
        recordFallback(year, level, sourceFile, sourceYear)
        rows.forEach((row) => addTrendValue(normalizeSchoolCode(row['學校代碼']), year, level, detailFile.sumRow(row), {
          countyName: row['縣市名稱'],
          townName: row['鄉鎮市區'],
          schoolName: row['學校名稱'],
          composition: detailFile.breakdownRow?.(row),
        }))
      }
    }
  }

  return { trendsByCode, fallbackEntries }
}

export async function buildOfficialDataset(boundaries) {
  const [points, directoryLookup, trendLookupResult] = await Promise.all([fetchAllSchoolPoints(), buildDirectoryLookup(), buildTrendLookup()])
  const { trendsByCode: trendLookup, fallbackEntries } = trendLookupResult
  const countyMap = new Map()
  const processedKeys = new Set()
  const coordinatesByCode = new Map()
  const locationByCode = new Map()
  const dataNotes = buildDatasetNotes(fallbackEntries)
  const countyBoundaryLookup = new Map(Object.values(boundaries.countyCoordinateLookup).map((entry) => [entry.countyName, entry]))
  const townshipBoundaryLookup = new Map(Object.values(boundaries.townshipCoordinateLookup).map((entry) => [entry.legacyTownId, entry]))

  for (const feature of points) {
    const code = normalizeSchoolCode(feature.attributes['代碼'])
    const level = Object.entries(LEVEL_CONFIG).find(([, config]) => config.pointLevel === feature.attributes['學校級別'])?.[0]
    const trendKey = `${code}:${level}`
    const trendEntry = trendLookup.get(trendKey)
    if (!trendEntry || !level) continue

    processedKeys.add(trendKey)
    const gisCoordinates = { longitude: Number(feature.geometry.x.toFixed(6)), latitude: Number(feature.geometry.y.toFixed(6)) }
    coordinatesByCode.set(code, gisCoordinates)

    const countyName = normalizeCountyName(feature.attributes['縣市名稱'])
    const townName = normalizeTownName(feature.attributes['鄉鎮市區'])
    const region = REGION_BY_COUNTY[countyName]
    if (!region) continue

    const countyBoundary = countyBoundaryLookup.get(countyName)
    const townshipBoundary = townshipBoundaryLookup.get(`${countyName}:${townName}`)
    const countyCode = countyBoundary?.countyCode || countyName
    const townCode = townshipBoundary?.townCode || `${countyCode}:${townName}`

    const directoryRow = directoryLookup.get(code)
    const countyId = countyName
    const townshipId = `${countyName}:${townName}`
    locationByCode.set(code, { countyName, townName, countyId, townshipId, countyCode, townCode })

    if (!countyMap.has(countyId)) {
      countyMap.set(countyId, {
        id: countyId,
        countyCode,
        name: countyName,
        shortLabel: shortCountyLabel(countyName),
        region,
        legacyCountyId: countyId,
        towns: new Map(),
      })
    }

    const county = countyMap.get(countyId)
    if (!county.towns.has(townshipId)) {
      county.towns.set(townshipId, {
        id: townshipId,
        countyId,
        countyCode,
        townCode,
        legacyTownshipId: townshipId,
        name: townName,
        schools: [],
      })
    }

    const yearlyStudents = ACADEMIC_YEARS.map((year) => ({ year, students: trendEntry.yearlyStudents.get(year) ?? 0 }))
    const studentCompositions = buildYearlyCompositions(trendEntry)
    const annotations = buildSchoolAnnotations(yearlyStudents)

    county.towns.get(townshipId).schools.push({
      id: code,
      code,
      schoolLevelId: `${code}:${level}`,
      name: normalizeText(feature.attributes['學校名稱']),
      countyId,
      townshipId,
      countyCode,
      townCode,
      legacyCountyId: countyId,
      legacyTownshipId: townshipId,
      educationLevel: level,
      managementType: inferManagementType(directoryRow, normalizeText(feature.attributes['學校名稱'])),
      address: normalizeText(feature.attributes['地址'] ?? directoryRow?.['地址']),
      phone: normalizeText(feature.attributes['電話'] ?? directoryRow?.['電話']),
      website: normalizeText(feature.attributes['網址'] ?? directoryRow?.['網址']),
      profileUrl: normalizeText(feature.attributes['學校概況']),
      coordinates: gisCoordinates,
      yearlyStudents,
      studentCompositions,
      status: annotations.status,
      missingYears: annotations.missingYears,
      dataNotes: annotations.dataNotes,
    })
  }

  // ── Second pass: include schools from trend data missing from point layer ──
  // This also picks up the other-level side of 完全中學 (e.g. the 國中部
  // when the GIS entry is classified as 高級中等學校).
  const missingCoordinates = []
  for (const [trendKey, trendEntry] of trendLookup) {
    if (processedKeys.has(trendKey)) continue

    const code = trendEntry.code
    const directoryRow = directoryLookup.get(code)

    const level = trendEntry.level
    if (!level) continue

    const sharedLocation = locationByCode.get(code)
    const countyName = normalizeCountyName(trendEntry.countyName || directoryRow?.['縣市名稱'] || sharedLocation?.countyName || '')
    const townName = normalizeTownName(trendEntry.townName || directoryRow?.['鄉鎮市區'] || sharedLocation?.townName || '')
    const region = REGION_BY_COUNTY[countyName]
    if (!region || !countyName || !townName) continue

    const countyBoundary = countyBoundaryLookup.get(countyName)
    const townshipBoundary = townshipBoundaryLookup.get(`${countyName}:${townName}`)
    const countyId = countyName
    const townshipId = `${countyName}:${townName}`
    const countyCode = countyBoundary?.countyCode || sharedLocation?.countyCode || countyName
    const townCode = townshipBoundary?.townCode || sharedLocation?.townCode || `${countyCode}:${townName}`

    if (!countyMap.has(countyId)) {
      countyMap.set(countyId, {
        id: countyId,
        countyCode,
        name: countyName,
        shortLabel: shortCountyLabel(countyName),
        region,
        legacyCountyId: countyId,
        towns: new Map(),
      })
    }

    const county = countyMap.get(countyId)
    if (!county.towns.has(townshipId)) {
      county.towns.set(townshipId, {
        id: townshipId,
        countyId,
        countyCode,
        townCode,
        legacyTownshipId: townshipId,
        name: townName,
        schools: [],
      })
    }

    const address = normalizeText(directoryRow?.['地址'] ?? '')
    // Reuse GIS coordinates when another level of the same school was
    // already matched in the first pass (e.g. 完全中學 國中部 reuses
    // the 高中部's GIS point).
    const sharedCoord = coordinatesByCode.get(code)
    const resolvedCoordinate = sharedCoord ? null : await resolveMissingSchoolCoordinate({ code, schoolName: normalizeText(trendEntry.schoolName || directoryRow?.['學校名稱'] || code), countyName, townName, address })
    const finalCoordinates = sharedCoord
      ?? (resolvedCoordinate ? { longitude: resolvedCoordinate.longitude, latitude: resolvedCoordinate.latitude } : { longitude: 0, latitude: 0 })
    if (finalCoordinates.longitude !== 0 && finalCoordinates.latitude !== 0) {
      coordinatesByCode.set(code, finalCoordinates)
      locationByCode.set(code, { countyName, townName, countyId, townshipId, countyCode, townCode })
    }
    const yearlyStudents = ACADEMIC_YEARS.map((year) => ({ year, students: trendEntry.yearlyStudents.get(year) ?? 0 }))
    const studentCompositions = buildYearlyCompositions(trendEntry)
    const annotations = buildSchoolAnnotations(yearlyStudents)
    const schoolName = normalizeText(trendEntry.schoolName || directoryRow?.['學校名稱'] || code)

    if (!sharedCoord) {
      annotations.dataNotes.push({
        type: '其他',
        message: resolvedCoordinate?.note ?? '正式統計資料存在但 GIS 點位缺失，座標使用鄉鎮近似值。',
        severity: 'info',
      })
    }
    const missingCoordinateEntry = {
      code,
      name: schoolName,
      county: countyName,
      township: townName,
      level,
      address,
      countyCode,
      townCode,
      longitude: finalCoordinates.longitude || resolvedCoordinate?.longitude,
      latitude: finalCoordinates.latitude || resolvedCoordinate?.latitude,
      coordinateResolution: sharedCoord ? '共用 GIS 點位' : (resolvedCoordinate?.resolution ?? '鄉鎮近似值'),
      coordinateMatchType: resolvedCoordinate?.matchType,
      coordinateMatchScore: resolvedCoordinate?.matchScore,
    }
    missingCoordinates.push(missingCoordinateEntry)

    // Use composite id when another level of the same school was already
    // processed (完全中學 etc.) to ensure unique React keys.
    const schoolId = coordinatesByCode.has(code) ? `${code}:${level}` : code

    county.towns.get(townshipId).schools.push({
      id: schoolId,
      code,
      schoolLevelId: `${code}:${level}`,
      name: schoolName,
      countyId,
      townshipId,
      countyCode,
      townCode,
      legacyCountyId: countyId,
      legacyTownshipId: townshipId,
      educationLevel: level,
      managementType: inferManagementType(directoryRow, schoolName),
      address,
      phone: normalizeText(directoryRow?.['電話'] ?? ''),
      website: normalizeText(directoryRow?.['網址'] ?? ''),
      profileUrl: '',
      coordinates: finalCoordinates,
      yearlyStudents,
      studentCompositions,
      status: annotations.status,
      missingYears: annotations.missingYears,
      dataNotes: annotations.dataNotes,
      _missingGIS: true,
      _missingCoordinateEntry: missingCoordinateEntry,
    })
  }

  if (missingCoordinates.length > 0) {
    console.warn(`${missingCoordinates.length} schools in trend data but missing from GIS point layer:`)
    for (const s of missingCoordinates) console.warn(`  ${s.code} ${s.name} (${s.county} ${s.township})`)
    const resolvedCount = missingCoordinates.filter((entry) => entry.coordinateResolution !== '鄉鎮近似值').length
    console.warn(`Resolved ${resolvedCount} of ${missingCoordinates.length} missing GIS schools with reviewed or address-based coordinates.`)
  }

  // ── Third pass: backfill 0,0 coordinates with township centroid ──
  for (const county of countyMap.values()) {
    for (const town of county.towns.values()) {
      const located = town.schools.filter((s) => s.coordinates.longitude !== 0 && s.coordinates.latitude !== 0)
      if (located.length === 0) continue
      const centroid = {
        longitude: Number((located.reduce((sum, s) => sum + s.coordinates.longitude, 0) / located.length).toFixed(6)),
        latitude: Number((located.reduce((sum, s) => sum + s.coordinates.latitude, 0) / located.length).toFixed(6)),
      }
      for (const school of town.schools) {
        if (school.coordinates.longitude === 0 && school.coordinates.latitude === 0) {
          school.coordinates = centroid
          if (school._missingCoordinateEntry) {
            school._missingCoordinateEntry.longitude = centroid.longitude
            school._missingCoordinateEntry.latitude = centroid.latitude
          }
        }
      }
    }
  }

  const counties = [...countyMap.values()]
    .map((county) => {
      const towns = [...county.towns.values()]
        .map((town) => {
          const schools = town.schools.sort((left, right) => (right.yearlyStudents.at(-1)?.students ?? 0) - (left.yearlyStudents.at(-1)?.students ?? 0))
          return { ...town, schools, dataNotes: buildScopeNotes(schools, town.name) }
        })
        .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'))

      const countySchools = towns.flatMap((town) => town.schools)
      return {
        id: county.id,
        countyCode: county.countyCode,
        legacyCountyId: county.legacyCountyId,
        name: county.name,
        shortLabel: county.shortLabel,
        region: county.region,
        towns,
        dataNotes: buildScopeNotes(countySchools, county.name),
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'))

  const schoolIdCounts = new Map()
  counties.forEach((county) => {
    county.towns.forEach((town) => {
      town.schools.forEach((school) => {
        schoolIdCounts.set(school.id, (schoolIdCounts.get(school.id) ?? 0) + 1)
      })
    })
  })

  counties.forEach((county) => {
    county.towns.forEach((town) => {
      town.schools.forEach((school) => {
        if ((schoolIdCounts.get(school.id) ?? 0) > 1) {
          school.id = `${school.code}:${school.educationLevel}`
        }
      })
    })
  })

  const sources = {
    points: 'https://stats.moe.gov.tw/portal/apps/experiencebuilder/experience/?id=518f8458d5fb44e288e8fe5c95457c20',
    statistics: 'https://depart.moe.gov.tw/ED4500/News_Content.aspx?n=5A930C32CC6C3818&sms=91B3AAE8C6388B96&s=33128143574210DF',
    townshipBoundaries: 'https://data.gov.tw/dataset/7441',
    countyBoundaries: 'https://data.gov.tw/dataset/7442',
  }

  // ── Build school code index for frontend search ──
  const schoolCodeIndex = {}
  const schoolCoordinateLookup = {}
  const levelOrder = new Map([['國小', 1], ['國中', 2], ['高中職', 3], ['大專院校', 4]])
  for (const county of counties) {
    for (const town of county.towns) {
      for (const school of town.schools) {
        const existingIndexEntry = schoolCodeIndex[school.code]
        schoolCodeIndex[school.code] = {
          countyId: existingIndexEntry?.countyId ?? county.id,
          townshipId: existingIndexEntry?.townshipId ?? town.id,
          countyCode: existingIndexEntry?.countyCode ?? county.countyCode,
          townCode: existingIndexEntry?.townCode ?? town.townCode,
          countyName: existingIndexEntry?.countyName ?? county.name,
          townshipName: existingIndexEntry?.townshipName ?? town.name,
          name: existingIndexEntry?.name ?? school.name,
          schoolIds: [...new Set([...(existingIndexEntry?.schoolIds ?? []), school.id])],
          levels: [...new Set([...(existingIndexEntry?.levels ?? []), school.educationLevel])].sort((left, right) => (levelOrder.get(left) ?? 99) - (levelOrder.get(right) ?? 99)),
          longitude: existingIndexEntry?.longitude ?? school.coordinates.longitude,
          latitude: existingIndexEntry?.latitude ?? school.coordinates.latitude,
        }
        schoolCoordinateLookup[school.code] = {
          code: school.code,
          name: school.name,
          countyId: county.id,
          townshipId: town.id,
          countyCode: county.countyCode,
          townCode: town.townCode,
          longitude: school.coordinates.longitude,
          latitude: school.coordinates.latitude,
        }
      }
    }
  }

  const generatedAt = new Date().toISOString()
  const countySchoolAtlasSlices = counties.map((county) => {
    const schoolAtlasByCode = new Map()

    county.towns.forEach((town) => {
      town.schools.forEach((school) => {
        if (!schoolAtlasByCode.has(school.code)) {
          schoolAtlasByCode.set(school.code, {
            code: school.code,
            primaryName: school.name,
            aliases: new Set([school.name]),
            levels: [],
          })
        }

        const schoolAtlasEntry = schoolAtlasByCode.get(school.code)
        schoolAtlasEntry.aliases.add(school.name)
        schoolAtlasEntry.levels.push({
          schoolId: school.id,
          schoolLevelId: school.schoolLevelId,
          name: school.name,
          educationLevel: school.educationLevel,
          managementType: school.managementType,
          countyId: county.id,
          countyCode: county.countyCode,
          countyName: county.name,
          townshipId: town.id,
          townCode: town.townCode,
          townshipName: town.name,
          coordinates: school.coordinates,
          address: school.address,
          phone: school.phone,
          website: school.website,
          profileUrl: school.profileUrl,
          yearlyStudents: school.yearlyStudents,
          studentCompositions: school.studentCompositions ?? [],
          status: school.status,
          missingYears: school.missingYears,
          dataNotes: school.dataNotes,
        })
      })
    })

    const schools = [...schoolAtlasByCode.values()]
      .map((entry) => ({
        code: entry.code,
        primaryName: entry.primaryName,
        aliases: [...entry.aliases].sort((left, right) => left.localeCompare(right, 'zh-Hant')),
        levels: entry.levels.sort((left, right) => {
          const levelDelta = (levelOrder.get(left.educationLevel) ?? 99) - (levelOrder.get(right.educationLevel) ?? 99)
          if (levelDelta !== 0) return levelDelta
          return left.name.localeCompare(right.name, 'zh-Hant')
        }),
      }))
      .sort((left, right) => left.code.localeCompare(right.code, 'en'))

    return {
      countyId: county.id,
      fileName: toCountySchoolAtlasFile(county.id),
      detail: {
        generatedAt,
        years: ACADEMIC_YEARS,
        county: {
          id: county.id,
          countyCode: county.countyCode,
          legacyCountyId: county.legacyCountyId,
          name: county.name,
          shortLabel: county.shortLabel,
          region: county.region,
        },
        schools,
      },
    }
  })

  const schoolAtlasIndexDataset = {
    generatedAt,
    years: ACADEMIC_YEARS,
    counties: countySchoolAtlasSlices.map((entry) => ({
      countyId: entry.countyId,
      countyCode: entry.detail.county.countyCode,
      countyName: entry.detail.county.name,
      schoolAtlasFile: entry.fileName,
      schoolCount: entry.detail.schools.length,
      levelCount: entry.detail.schools.reduce((sum, school) => sum + school.levels.length, 0),
    })),
  }

  return {
    generatedAt,
    years: ACADEMIC_YEARS,
    sources,
    missingCoordinates,
    schoolAtlasIndexDataset,
    countySchoolAtlasSlices,
    summaryDataset: {
      generatedAt,
      years: ACADEMIC_YEARS,
      schoolAtlasFile: 'school-atlas/index.json',
      sources,
      dataNotes,
      schoolCodeIndex,
      missingCoordinates,
      counties: counties.map((county) => ({
        id: county.id,
        countyCode: county.countyCode,
        legacyCountyId: county.legacyCountyId,
        name: county.name,
        shortLabel: county.shortLabel,
        region: county.region,
        townshipFile: `townships/${county.id}.topo.json`,
        detailFile: `counties/${toCountyDetailFile(county.id)}`,
        bucketFile: `buckets/${toCountyBucketFile(county.id)}`,
        schoolAtlasFile: toCountySchoolAtlasFile(county.id),
        dataNotes: county.dataNotes,
        summaries: buildSummarySeries(county.towns.flatMap((town) => town.schools)),
        towns: county.towns.map((town) => ({
          id: town.id,
          countyId: town.countyId,
          countyCode: town.countyCode,
          townCode: town.townCode,
          legacyTownshipId: town.legacyTownshipId,
          name: town.name,
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
          countyCode: county.countyCode,
          legacyCountyId: county.legacyCountyId,
          name: county.name,
          shortLabel: county.shortLabel,
          region: county.region,
        },
        dataNotes: county.dataNotes,
        towns: county.towns,
      },
    })),
    countyBuckets: counties.map((county) => ({ fileName: toCountyBucketFile(county.id), detail: buildCountyBucketSlice(county) })),
    schoolCoordinateLookup: {
      generatedAt,
      schools: schoolCoordinateLookup,
    },
  }
}