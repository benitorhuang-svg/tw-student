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
    dataNotes.push({ type: '缺年度', message: `缺少學年度資料：${missingYears.join('、')}`, severity: 'warning', years: missingYears })
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
  const pointLayer = await fetchJson('https://stats.moe.gov.tw/server/rest/services/Hosted/113學年各級學校名錄點位/FeatureServer/0?f=pjson')
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

    const result = await fetchJson(`https://stats.moe.gov.tw/server/rest/services/Hosted/113學年各級學校名錄點位/FeatureServer/0/query?${query.toString()}`)
    allFeatures.push(...result.features)

    if (!result.exceededTransferLimit || result.features.length < pageSize) break
    offset += pageSize
  }

  return allFeatures
}

function inferManagementType(directoryRow, schoolName) {
  if (directoryRow?.['公/私立']) return normalizeText(directoryRow['公/私立'])
  return schoolName.includes('私立') ? '私立' : '公立'
}

async function buildDirectoryLookup() {
  const lookup = new Map()
  for (const config of Object.values(LEVEL_CONFIG)) {
    for (const fileName of config.directoryFiles) {
      const rows = parseCsv(await fetchText(`https://stats.moe.gov.tw/files/school/${CURRENT_YEAR}/${fileName}`))
      rows.forEach((row) => {
        lookup.set(normalizeSchoolCode(row['代碼']), row)
      })
    }
  }
  return lookup
}

async function buildTrendLookup() {
  const trendsByCode = new Map()

  const addTrendValue = (code, year, level, students) => {
    if (!code || students <= 0) return
    if (!trendsByCode.has(code)) trendsByCode.set(code, { level, yearlyStudents: new Map() })
    const entry = trendsByCode.get(code)
    entry.level = level
    entry.yearlyStudents.set(year, students + (entry.yearlyStudents.get(year) ?? 0))
  }

  for (const year of ACADEMIC_YEARS) {
    for (const [level, config] of Object.entries(LEVEL_CONFIG)) {
      if ('detailFile' in config) {
        const rows = parseCsv(await fetchText(`https://stats.moe.gov.tw/files/detail/${year}/${year}_${config.detailFile}`))
        rows.forEach((row) => addTrendValue(normalizeSchoolCode(row['學校代碼']), year, level, config.sumRow(row)))
        continue
      }

      for (const detailFile of config.detailFiles) {
        const rows = parseCsv(await fetchText(`https://stats.moe.gov.tw/files/detail/${year}/${year}_${detailFile.name}`))
        rows.forEach((row) => addTrendValue(normalizeSchoolCode(row['學校代碼']), year, level, detailFile.sumRow(row)))
      }
    }
  }

  return trendsByCode
}

export async function buildOfficialDataset() {
  const [points, directoryLookup, trendLookup] = await Promise.all([fetchAllSchoolPoints(), buildDirectoryLookup(), buildTrendLookup()])
  const countyMap = new Map()

  for (const feature of points) {
    const code = normalizeSchoolCode(feature.attributes['代碼'])
    const trendEntry = trendLookup.get(code)
    const level = Object.entries(LEVEL_CONFIG).find(([, config]) => config.pointLevel === feature.attributes['學校級別'])?.[0]
    if (!trendEntry || !level) continue

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

  return {
    generatedAt: new Date().toISOString(),
    years: ACADEMIC_YEARS,
    sources,
    summaryDataset: {
      generatedAt: new Date().toISOString(),
      years: ACADEMIC_YEARS,
      sources,
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
  }
}