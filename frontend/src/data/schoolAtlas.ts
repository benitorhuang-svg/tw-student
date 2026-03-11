import { recordResourceLoad } from './atlasLoadObservation'
import { buildDataAssetUrl, parseJsonDataResponse } from './dataAsset'
import type { CountySchoolAtlasDataset } from './educationTypes'

const countySchoolAtlasMemoryCache = new Map<string, CountySchoolAtlasDataset>()
const pendingCountySchoolAtlasRequests = new Map<string, Promise<CountySchoolAtlasDataset>>()

type LoadCountySchoolAtlasOptions = {
  forceRefresh?: boolean
}

function getSchoolAtlasUrl(filePath: string, forceRefresh = false) {
  return buildDataAssetUrl(filePath, forceRefresh)
}

function detectCountyIdFromSchoolAtlasFile(filePath: string) {
  return filePath.replace(/^school-atlas\//, '').replace(/\.json$/, '')
}

export async function loadCountySchoolAtlas(
  schoolAtlasFile: string,
  countyId?: string,
  options: LoadCountySchoolAtlasOptions = {},
) {
  const resolvedCountyId = countyId ?? detectCountyIdFromSchoolAtlasFile(schoolAtlasFile)

  if (options.forceRefresh) {
    countySchoolAtlasMemoryCache.delete(resolvedCountyId)
    pendingCountySchoolAtlasRequests.delete(resolvedCountyId)
  }

  if (countySchoolAtlasMemoryCache.has(resolvedCountyId)) {
    recordResourceLoad({ source: 'memory', resourceKey: schoolAtlasFile })
    return countySchoolAtlasMemoryCache.get(resolvedCountyId) as CountySchoolAtlasDataset
  }

  const pendingRequest = pendingCountySchoolAtlasRequests.get(resolvedCountyId)
  if (pendingRequest) {
    return pendingRequest
  }

  const nextRequest = (async () => {
    const url = getSchoolAtlasUrl(schoolAtlasFile, options.forceRefresh)
    const response = await fetch(url, {
      cache: options.forceRefresh ? 'no-store' : 'default',
    })

    const detail = await parseJsonDataResponse<CountySchoolAtlasDataset>(response, schoolAtlasFile, url)
    const bytes = Number(response.headers.get('content-length') ?? 0)
    countySchoolAtlasMemoryCache.set(resolvedCountyId, detail)
    recordResourceLoad({ source: 'network', resourceKey: schoolAtlasFile, bytes })
    return detail
  })()

  pendingCountySchoolAtlasRequests.set(resolvedCountyId, nextRequest)
  try {
    return await nextRequest
  } finally {
    pendingCountySchoolAtlasRequests.delete(resolvedCountyId)
  }
}

export function resetSchoolAtlasCache() {
  countySchoolAtlasMemoryCache.clear()
  pendingCountySchoolAtlasRequests.clear()
}