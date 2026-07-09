import { ACADEMIC_YEARS, fetchArrayBuffer, parseOfficialWorkbook } from '../refresh-helpers.mjs'

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

export function buildWorkbookCandidates(baseUrl, sourceYear, parserKey, fileNameBuilder = (year, key, extension) => `${year}_${key}.${extension}`) {
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

export async function fetchDetailRowsWithFallback(fileName, requestedYear) {
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
