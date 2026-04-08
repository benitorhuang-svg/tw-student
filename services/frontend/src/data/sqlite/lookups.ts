import { recordResourceLoad } from '../atlasLoadObservation'
import type { LoadDatabaseOptions } from './connection'
import { mapRows, parseJsonValue } from './mappers'

export type TownshipCoordinateLookupEntry = {
  countyId: string
  countyCode?: string
  countyName: string
  townId: string
  legacyTownId?: string
  townCode?: string
  townName: string
  region: string
  longitude: number
  latitude: number
}

export type AreaCoordinateLookup = {
  generatedAt?: string
  counties: Record<string, unknown>
  townships: Record<string, TownshipCoordinateLookupEntry>
}

export type SchoolCoordinateLookupEntry = {
  code: string
  name: string
  countyId: string
  townshipId: string
  longitude: number
  latitude: number
}

export type SchoolCoordinateLookup = {
  generatedAt?: string
  schools: Record<string, SchoolCoordinateLookupEntry>
}

const AREA_LOOKUP_RESOURCE_KEY = 'sqlite:areaCoordinateLookup'
const SCHOOL_LOOKUP_RESOURCE_KEY = 'sqlite:schoolCoordinateLookup'

const EMPTY_AREA_LOOKUP: AreaCoordinateLookup = {
  counties: {},
  townships: {},
}

const EMPTY_SCHOOL_LOOKUP: SchoolCoordinateLookup = {
  schools: {},
}

let areaLookupCache: AreaCoordinateLookup | null = null
let schoolLookupCache: SchoolCoordinateLookup | null = null
let pendingAreaLookupRequest: Promise<AreaCoordinateLookup> | null = null
let pendingSchoolLookupRequest: Promise<SchoolCoordinateLookup> | null = null

async function loadMetaLookup<T>(
  key: string,
  fallbackValue: T,
  resourceKey: string,
  options: LoadDatabaseOptions = {},
) {
  const bytes = await import('./sqliteWorkerClient').then((m) => m.initSqliteWorker(options.forceRefresh))
  const rows = mapRows(await import('./sqliteWorkerClient').then((m) => m.execInSqlite('SELECT value FROM meta WHERE key = ?', [key])))
  const json = rows[0]?.value as string | undefined
  const value = json ? parseJsonValue<T>(json, fallbackValue) : fallbackValue

  recordResourceLoad({
    source: 'sqlite',
    resourceKey,
    bytes,
  })

  return value
}

export async function loadAreaCoordinateLookup(options: LoadDatabaseOptions = {}) {
  if (options.forceRefresh) {
    areaLookupCache = null
    pendingAreaLookupRequest = null
  }

  if (areaLookupCache) {
    recordResourceLoad({
      source: 'memory',
      resourceKey: AREA_LOOKUP_RESOURCE_KEY,
    })
    return areaLookupCache
  }

  if (!pendingAreaLookupRequest) {
    pendingAreaLookupRequest = loadMetaLookup('areaCoordinateLookup', EMPTY_AREA_LOOKUP, AREA_LOOKUP_RESOURCE_KEY, options)
      .then((lookup) => {
        areaLookupCache = lookup
        return lookup
      })
      .finally(() => {
        pendingAreaLookupRequest = null
      })
  }

  return pendingAreaLookupRequest
}

export async function loadSchoolCoordinateLookup(options: LoadDatabaseOptions = {}) {
  if (options.forceRefresh) {
    schoolLookupCache = null
    pendingSchoolLookupRequest = null
  }

  if (schoolLookupCache) {
    recordResourceLoad({
      source: 'memory',
      resourceKey: SCHOOL_LOOKUP_RESOURCE_KEY,
    })
    return schoolLookupCache
  }

  if (!pendingSchoolLookupRequest) {
    pendingSchoolLookupRequest = loadMetaLookup('schoolCoordinateLookup', EMPTY_SCHOOL_LOOKUP, SCHOOL_LOOKUP_RESOURCE_KEY, options)
      .then((lookup) => {
        schoolLookupCache = lookup
        return lookup
      })
      .finally(() => {
        pendingSchoolLookupRequest = null
      })
  }

  return pendingSchoolLookupRequest
}

export function resetLookupCache() {
  areaLookupCache = null
  schoolLookupCache = null
  pendingAreaLookupRequest = null
  pendingSchoolLookupRequest = null
}