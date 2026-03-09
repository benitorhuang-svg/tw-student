import {
  ACADEMIC_YEARS,
  CURRENT_YEAR,
  LEVEL_CONFIG,
  REGION_BY_COUNTY,
  SUMMARY_EDUCATION_LEVELS,
  SUMMARY_MANAGEMENT_TYPES,
  fetchJson,
  fetchText,
  normalizeCountyName,
  normalizeSchoolCode,
  normalizeText,
  normalizeTownName,
  parseCsv,
  shortCountyLabel,
  summaryBucketKey,
  toCountyBucketFile,
  toCountyDetailFile,
} from './refresh-helpers.mjs'
import { buildCountyBucketSlice } from './build-county-buckets.mjs'

const MANUAL_COORDINATE_OVERRIDES = {
  193667: {
    longitude: 120.691423,
    latitude: 24.186995,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依校址人工覆核校正。',
    matchType: 'manual-review',
    matchScore: 100,
  },
}

const GEOCODER_ACCEPTED_TYPES = new Set(['PointAddress', 'StreetAddress', 'StreetAddressExt', 'StreetName'])

function normalizeAddressForGeocoding(address) {
  return normalizeText(address)
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .trim()
}

async function resolveMissingSchoolCoordinate(code, address) {
  const manualOverride = MANUAL_COORDINATE_OVERRIDES[code]
  if (manualOverride) {
    return manualOverride
  }

  const normalizedAddress = normalizeAddressForGeocoding(address)
  if (!normalizedAddress) {
    return null
  }

  const query = new URLSearchParams({
    f: 'pjson',
    singleLine: normalizedAddress,
    countryCode: 'TWN',
    maxLocations: '1',
    outFields: 'Match_addr,Addr_type,Score',
  })

  try {
    const response = await fetchJson(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${query.toString()}`)
    const candidate = response?.candidates?.[0]
    if (!candidate) {
      return null
    }

    const matchType = candidate.attributes?.Addr_type ?? ''
    const matchScore = Number(candidate.score ?? 0)
    if (!GEOCODER_ACCEPTED_TYPES.has(matchType) || matchScore < 80) {
      return null
    }

    return {
      longitude: Number(candidate.location.x.toFixed(6)),
      latitude: Number(candidate.location.y.toFixed(6)),
      resolution: '地址解點',
      note: matchType === 'StreetName'
        ? '正式統計資料存在但 GIS 點位缺失，座標改採校址街道解點。'
        : '正式統計資料存在但 GIS 點位缺失，座標改採校址解點。',
      matchType,
      matchScore,
    }
  } catch (error) {
    console.warn(`Failed to geocode missing school ${code}: ${normalizedAddress}`)
    console.warn(error)
    return null
  }
}

async function fetchYearTextWithFallback(urlBuilder, requestedYear) {
  let lastError = null

  for (let sourceYear = requestedYear; sourceYear >= ACADEMIC_YEARS[0]; sourceYear -= 1) {
    try {
      const text = await fetchText(urlBuilder(sourceYear))
      if (sourceYear !== requestedYear) {
        console.warn(`Fallback to ${sourceYear} for ${requestedYear}: ${urlBuilder(sourceYear)}`)
      }
      return text
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error(`Unable to fetch source for ${requestedYear}`)
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
    for (const fileName of config.directoryFiles) {
      const rows = parseCsv(await fetchYearTextWithFallback((sourceYear) => `https://stats.moe.gov.tw/files/school/${sourceYear}/${fileName}`, CURRENT_YEAR))
      rows.forEach((row) => {
        lookup.set(normalizeSchoolCode(row['代碼']), row)
      })
    }
  }
  return lookup
}

async function buildTrendLookup() {
  const trendsByCode = new Map()

  const addTrendValue = (code, year, level, students, scope = {}) => {
    if (!code || students <= 0) return
    if (!trendsByCode.has(code)) {
      trendsByCode.set(code, {
        level,
        yearlyStudents: new Map(),
        countyName: '',
        townName: '',
      })
    }

    const entry = trendsByCode.get(code)
    entry.level = level
    if (!entry.countyName && scope.countyName) {
      entry.countyName = normalizeCountyName(scope.countyName)
    }
    if (!entry.townName && scope.townName) {
      entry.townName = normalizeTownName(scope.townName)
    }
    entry.yearlyStudents.set(year, students + (entry.yearlyStudents.get(year) ?? 0))
  }

  for (const year of ACADEMIC_YEARS) {
    for (const [level, config] of Object.entries(LEVEL_CONFIG)) {
      if ('detailFile' in config) {
        const rows = parseCsv(
          await fetchYearTextWithFallback(
            (sourceYear) => `https://stats.moe.gov.tw/files/detail/${sourceYear}/${sourceYear}_${config.detailFile}`,
            year,
          ),
        )
        rows.forEach((row) => addTrendValue(normalizeSchoolCode(row['學校代碼']), year, level, config.sumRow(row), {
          countyName: row['縣市名稱'],
          townName: row['鄉鎮市區'],
        }))
        continue
      }

      for (const detailFile of config.detailFiles) {
        const rows = parseCsv(
          await fetchYearTextWithFallback(
            (sourceYear) => `https://stats.moe.gov.tw/files/detail/${sourceYear}/${sourceYear}_${detailFile.name}`,
            year,
          ),
        )
        rows.forEach((row) => addTrendValue(normalizeSchoolCode(row['學校代碼']), year, level, detailFile.sumRow(row), {
          countyName: row['縣市名稱'],
          townName: row['鄉鎮市區'],
        }))
      }
    }
  }

  return trendsByCode
}

export async function buildOfficialDataset() {
  const [points, directoryLookup, trendLookup] = await Promise.all([fetchAllSchoolPoints(), buildDirectoryLookup(), buildTrendLookup()])
  const countyMap = new Map()
  const processedCodes = new Set()

  for (const feature of points) {
    const code = normalizeSchoolCode(feature.attributes['代碼'])
    const trendEntry = trendLookup.get(code)
    const level = Object.entries(LEVEL_CONFIG).find(([, config]) => config.pointLevel === feature.attributes['學校級別'])?.[0]
    if (!trendEntry || !level) continue

    processedCodes.add(code)

    const countyName = normalizeCountyName(feature.attributes['縣市名稱'])
    const townName = normalizeTownName(feature.attributes['鄉鎮市區'])
    const region = REGION_BY_COUNTY[countyName]
    if (!region) continue

    const directoryRow = directoryLookup.get(code)
    const countyId = countyName
    const townshipId = `${countyName}:${townName}`

    if (!countyMap.has(countyId)) {
      countyMap.set(countyId, { id: countyId, name: countyName, shortLabel: shortCountyLabel(countyName), region, towns: new Map() })
    }

    const county = countyMap.get(countyId)
    if (!county.towns.has(townshipId)) {
      county.towns.set(townshipId, { id: townshipId, name: townName, countyId, schools: [] })
    }

    const yearlyStudents = ACADEMIC_YEARS.map((year) => ({ year, students: trendEntry.yearlyStudents.get(year) ?? 0 }))
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
      coordinates: { longitude: Number(feature.geometry.x.toFixed(6)), latitude: Number(feature.geometry.y.toFixed(6)) },
      yearlyStudents,
      status: annotations.status,
      missingYears: annotations.missingYears,
      dataNotes: annotations.dataNotes,
    })
  }

  // ── Second pass: include schools from trend data missing from point layer ──
  const missingCoordinates = []
  for (const [code, trendEntry] of trendLookup) {
    if (processedCodes.has(code)) continue

    const directoryRow = directoryLookup.get(code)
    if (!directoryRow) continue

    const level = trendEntry.level
    if (!level) continue

    const countyName = normalizeCountyName(trendEntry.countyName || directoryRow['縣市名稱'] || '')
    const townName = normalizeTownName(trendEntry.townName || directoryRow['鄉鎮市區'] || '')
    const region = REGION_BY_COUNTY[countyName]
    if (!region || !countyName || !townName) continue

    const countyId = countyName
    const townshipId = `${countyName}:${townName}`

    if (!countyMap.has(countyId)) {
      countyMap.set(countyId, { id: countyId, name: countyName, shortLabel: shortCountyLabel(countyName), region, towns: new Map() })
    }

    const county = countyMap.get(countyId)
    if (!county.towns.has(townshipId)) {
      county.towns.set(townshipId, { id: townshipId, name: townName, countyId, schools: [] })
    }

    const address = normalizeText(directoryRow['地址'] ?? '')
    const resolvedCoordinate = await resolveMissingSchoolCoordinate(code, address)
    const yearlyStudents = ACADEMIC_YEARS.map((year) => ({ year, students: trendEntry.yearlyStudents.get(year) ?? 0 }))
    const annotations = buildSchoolAnnotations(yearlyStudents)
    const schoolName = normalizeText(directoryRow['學校名稱'] ?? code)

    annotations.dataNotes.push({
      type: '其他',
      message: resolvedCoordinate?.note ?? '正式統計資料存在但 GIS 點位缺失，座標使用鄉鎮近似值。',
      severity: 'info',
    })
    const missingCoordinateEntry = {
      code,
      name: schoolName,
      county: countyName,
      township: townName,
      level,
      address,
      longitude: resolvedCoordinate?.longitude,
      latitude: resolvedCoordinate?.latitude,
      coordinateResolution: resolvedCoordinate?.resolution ?? '鄉鎮近似值',
      coordinateMatchType: resolvedCoordinate?.matchType,
      coordinateMatchScore: resolvedCoordinate?.matchScore,
    }
    missingCoordinates.push(missingCoordinateEntry)

    county.towns.get(townshipId).schools.push({
      id: code,
      code,
      name: schoolName,
      countyId,
      townshipId,
      educationLevel: level,
      managementType: inferManagementType(directoryRow, schoolName),
      address,
      phone: normalizeText(directoryRow['電話'] ?? ''),
      website: normalizeText(directoryRow['網址'] ?? ''),
      profileUrl: '',
      coordinates: resolvedCoordinate
        ? { longitude: resolvedCoordinate.longitude, latitude: resolvedCoordinate.latitude }
        : { longitude: 0, latitude: 0 },
      yearlyStudents,
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
      return { id: county.id, name: county.name, shortLabel: county.shortLabel, region: county.region, towns, dataNotes: buildScopeNotes(countySchools, county.name) }
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'))

  const sources = {
    points: 'https://stats.moe.gov.tw/portal/apps/experiencebuilder/experience/?id=518f8458d5fb44e288e8fe5c95457c20',
    statistics: 'https://depart.moe.gov.tw/ED4500/News_Content.aspx?n=5A930C32CC6C3818&sms=91B3AAE8C6388B96&s=33128143574210DF',
    townshipBoundaries: 'https://data.gov.tw/dataset/7441',
    countyBoundaries: 'https://data.gov.tw/dataset/7442',
  }

  // ── Build school code index for frontend search ──
  const schoolCodeIndex = {}
  const schoolCoordinateLookup = {}
  for (const county of counties) {
    for (const town of county.towns) {
      for (const school of town.schools) {
        schoolCodeIndex[school.code] = {
          countyId: county.id,
          townshipId: town.id,
          name: school.name,
          longitude: school.coordinates.longitude,
          latitude: school.coordinates.latitude,
        }
        schoolCoordinateLookup[school.code] = {
          code: school.code,
          name: school.name,
          countyId: county.id,
          townshipId: town.id,
          longitude: school.coordinates.longitude,
          latitude: school.coordinates.latitude,
        }
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    years: ACADEMIC_YEARS,
    sources,
    missingCoordinates,
    summaryDataset: {
      generatedAt: new Date().toISOString(),
      years: ACADEMIC_YEARS,
      sources,
      schoolCodeIndex,
      missingCoordinates,
      counties: counties.map((county) => ({
        id: county.id,
        name: county.name,
        shortLabel: county.shortLabel,
        region: county.region,
        townshipFile: `townships/${county.id}.topo.json`,
        detailFile: `counties/${toCountyDetailFile(county.id)}`,
        bucketFile: `buckets/${toCountyBucketFile(county.id)}`,
        dataNotes: county.dataNotes,
        summaries: buildSummarySeries(county.towns.flatMap((town) => town.schools)),
        towns: county.towns.map((town) => ({ id: town.id, name: town.name, countyId: town.countyId, dataNotes: town.dataNotes, summaries: buildSummarySeries(town.schools) })),
      })),
    },
    countyDetails: counties.map((county) => ({
      fileName: toCountyDetailFile(county.id),
      detail: { county: { id: county.id, name: county.name, shortLabel: county.shortLabel, region: county.region }, dataNotes: county.dataNotes, towns: county.towns },
    })),
    countyBuckets: counties.map((county) => ({ fileName: toCountyBucketFile(county.id), detail: buildCountyBucketSlice(county) })),
    schoolCoordinateLookup: {
      generatedAt: new Date().toISOString(),
      schools: schoolCoordinateLookup,
    },
  }
}