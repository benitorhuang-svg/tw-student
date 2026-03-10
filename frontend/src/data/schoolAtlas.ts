import { recordResourceLoad } from './atlasLoadObservation'
import type { CountySchoolAtlasDataset } from './educationTypes'

const DATA_BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '')

const countySchoolAtlasMemoryCache = new Map<string, CountySchoolAtlasDataset>()
const pendingCountySchoolAtlasRequests = new Map<string, Promise<CountySchoolAtlasDataset>>()

type LoadCountySchoolAtlasOptions = {
  forceRefresh?: boolean
}

function getSchoolAtlasUrl(filePath: string, forceRefresh = false) {
  const baseUrl = `${DATA_BASE_URL}/data/${filePath}`
  return forceRefresh ? `${baseUrl}?refresh=${Date.now()}` : baseUrl
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
    const response = await fetch(getSchoolAtlasUrl(schoolAtlasFile, options.forceRefresh), {
      cache: options.forceRefresh ? 'no-store' : 'default',
    })

    if (!response.ok) {
      throw new Error(`無法載入校代碼結構資料 (${response.status})`)
    }

    const detail = await response.json() as CountySchoolAtlasDataset
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