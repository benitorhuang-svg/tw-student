import { ACADEMIC_YEARS, CURRENT_YEAR, LEVEL_CONFIG, fetchJson, normalizeCountyName, normalizeSchoolCode, normalizeText, normalizeTownName, parseOfficialWorkbook } from '../refresh-helpers.mjs'
import { buildWorkbookCandidates, fetchDetailRowsWithFallback } from './source-fetchers.mjs'
import { mergeComposition } from './school-summaries.mjs'

export async function fetchAllSchoolPoints() {
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

export function inferManagementType(directoryRow, schoolName) {
  if (directoryRow?.['公/私立']) return normalizeText(directoryRow['公/私立'])
  return schoolName.includes('私立') ? '私立' : '公立'
}

export async function buildDirectoryLookup() {
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

export async function buildTrendLookup() {
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
