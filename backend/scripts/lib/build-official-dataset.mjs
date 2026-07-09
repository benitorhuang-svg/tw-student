import {
  ACADEMIC_YEARS,
  LEVEL_CONFIG,
  REGION_BY_COUNTY,
  normalizeCountyName,
  normalizeSchoolCode,
  normalizeText,
  normalizeTownName,
  shortCountyLabel,
} from './refresh-helpers.mjs'
import { resolveMissingSchoolCoordinate } from './official-dataset/geocoding.mjs'
import { buildOfficialDatasetOutput } from './official-dataset/dataset-output.mjs'
import { buildDatasetNotes, buildSchoolAnnotations, buildYearlyCompositions } from './official-dataset/school-summaries.mjs'
import { buildDirectoryLookup, buildTrendLookup, fetchAllSchoolPoints, inferManagementType } from './official-dataset/source-lookups.mjs'

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


  return buildOfficialDatasetOutput({ countyMap, dataNotes, missingCoordinates })
}
