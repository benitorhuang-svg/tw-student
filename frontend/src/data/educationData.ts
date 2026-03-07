import type { FeatureCollection, Geometry } from 'geojson'

import { feature } from 'topojson-client'

export const ACADEMIC_YEARS = [107, 108, 109, 110, 111, 112, 113] as const

export const EDUCATION_LEVELS = ['全部', '國小', '國中', '高中職', '大專院校'] as const
export const MANAGEMENT_TYPES = ['全部', '公立', '私立'] as const
export const REGION_GROUPS = ['全部', '北部', '中部', '南部', '東部', '離島'] as const

export type AcademicYear = (typeof ACADEMIC_YEARS)[number]
export type EducationLevelFilter = (typeof EDUCATION_LEVELS)[number]
export type SchoolLevel = Exclude<EducationLevelFilter, '全部'>
export type ManagementTypeFilter = (typeof MANAGEMENT_TYPES)[number]
export type SchoolManagementType = Exclude<ManagementTypeFilter, '全部'>
export type RegionGroupFilter = (typeof REGION_GROUPS)[number]
export type RegionGroup = Exclude<RegionGroupFilter, '全部'>

export type TrendRecord = {
  year: AcademicYear
  students: number
  isEstimated?: boolean
  isMissing?: boolean
}

export type SummaryTrendRecord = {
  year: AcademicYear
  students: number
  schools: number
}

export type DataNote = {
  type: '停辦' | '缺年度' | '行政區改制' | '名稱異動' | '異常值' | '其他'
  message: string
  severity: 'info' | 'warning' | 'critical'
  years?: number[]
}

export type SchoolRecord = {
  id: string
  code: string
  name: string
  countyId: string
  townshipId: string
  educationLevel: SchoolLevel
  managementType: SchoolManagementType
  address: string
  phone: string
  website: string
  profileUrl?: string
  coordinates: {
    longitude: number
    latitude: number
  }
  yearlyStudents: TrendRecord[]
  status?: '正常' | '停辦' | '整併' | '待確認'
  missingYears?: AcademicYear[]
  dataNotes?: DataNote[]
}

export type TownshipRecord = {
  id: string
  name: string
  countyId: string
  schools: SchoolRecord[]
  dataNotes?: DataNote[]
}

export type CountyRecord = {
  id: string
  name: string
  shortLabel: string
  region: RegionGroup
  towns: TownshipRecord[]
  dataNotes?: DataNote[]
}

export type EducationDataset = {
  generatedAt: string
  years: readonly AcademicYear[]
  sources: {
    points: string
    statistics: string
    townshipBoundaries: string
    countyBoundaries: string
  }
  counties: CountyRecord[]
}

export type SummaryBucketKey = `${EducationLevelFilter}|${ManagementTypeFilter}`

export type TownshipSummaryRecord = {
  id: string
  name: string
  countyId: string
  dataNotes?: DataNote[]
  summaries: Record<SummaryBucketKey, SummaryTrendRecord[]>
}

export type CountySummaryRecord = {
  id: string
  name: string
  shortLabel: string
  region: RegionGroup
  townshipFile: string
  detailFile: string
  assetMetrics?: {
    detailBytes: number
    townshipBytes: number
  }
  dataNotes?: DataNote[]
  summaries: Record<SummaryBucketKey, SummaryTrendRecord[]>
  towns: TownshipSummaryRecord[]
}

export type EducationSummaryDataset = {
  generatedAt: string
  years: readonly AcademicYear[]
  assetMetrics?: {
    summaryBytes: number
    countyBoundaryBytes: number
    countyDetailBytes: number
    townshipBoundaryBytes: number
  }
  sources: {
    points: string
    statistics: string
    townshipBoundaries: string
    countyBoundaries: string
  }
  counties: CountySummaryRecord[]
}

export type CountyDetailDataset = {
  county: {
    id: string
    name: string
    shortLabel: string
    region: RegionGroup
  }
  dataNotes?: DataNote[]
  towns: TownshipRecord[]
}

export type CountyBoundaryProperties = {
  countyId: string
  countyCode: string
  countyName: string
  countyEng: string
  shortLabel: string
  region: RegionGroup
  townshipFile: string
}

export type TownshipBoundaryProperties = {
  countyId: string
  countyCode: string
  countyName: string
  townId: string
  townCode: string
  townName: string
  townEng: string
  region: RegionGroup
}

export type CountyBoundaryCollection = FeatureCollection<Geometry, CountyBoundaryProperties>
export type TownshipBoundaryCollection = FeatureCollection<Geometry, TownshipBoundaryProperties>

export type AtlasLoadSource = 'memory' | 'indexeddb' | 'network'

export type AtlasLoadObservationSnapshot = {
  loadedCountyDetails: string[]
  loadedTownshipSlices: string[]
  cacheHits: number
  memoryHits: number
  indexedDbHits: number
  networkFetches: number
  totalTransferredBytes: number
  resourceSizes: Record<string, number>
  lastLoadSource: AtlasLoadSource | null
}

export function buildSummaryBucketKey(
  educationLevel: EducationLevelFilter,
  managementType: ManagementTypeFilter,
): SummaryBucketKey {
  return `${educationLevel}|${managementType}`
}

type TopologyCollection = {
  type: 'Topology'
  objects: Record<string, unknown>
  arcs: unknown[]
  transform?: {
    scale: [number, number]
    translate: [number, number]
  }
}

function decodeFeatureCollection<TProperties>(
  topology: TopologyCollection,
  objectName: string,
): FeatureCollection<Geometry, TProperties> {
  const topologyObject = topology.objects[objectName]

  if (!topologyObject) {
    throw new Error(`缺少 TopoJSON 物件 ${objectName}`)
  }

  return feature(topology as never, topologyObject as never) as unknown as FeatureCollection<Geometry, TProperties>
}

const DB_NAME = 'student-counting-atlas'
const DB_VERSION = 1
const RESOURCE_STORE = 'resources'

const observationListeners = new Set<(snapshot: AtlasLoadObservationSnapshot) => void>()

let summaryCache: EducationSummaryDataset | null = null
let countyBoundaryCache: CountyBoundaryCollection | null = null
const countyDetailMemoryCache = new Map<string, CountyDetailDataset>()
const townshipBoundaryMemoryCache = new Map<string, TownshipBoundaryCollection>()
const pendingCountyDetailRequests = new Map<string, Promise<CountyDetailDataset>>()
const pendingTownshipBoundaryRequests = new Map<string, Promise<TownshipBoundaryCollection>>()
const countyDetailFileLookup = new Map<string, string>()
const townshipFileLookup = new Map<string, string>()

let loadObservationState: AtlasLoadObservationSnapshot = {
  loadedCountyDetails: [],
  loadedTownshipSlices: [],
  cacheHits: 0,
  memoryHits: 0,
  indexedDbHits: 0,
  networkFetches: 0,
  totalTransferredBytes: 0,
  resourceSizes: {},
  lastLoadSource: null,
}

type PersistedResource<T> = {
  key: string
  value: T
  updatedAt: string
}

function createObservationSnapshot(): AtlasLoadObservationSnapshot {
  return {
    ...loadObservationState,
    loadedCountyDetails: [...loadObservationState.loadedCountyDetails],
    loadedTownshipSlices: [...loadObservationState.loadedTownshipSlices],
    resourceSizes: { ...loadObservationState.resourceSizes },
  }
}

function emitObservation() {
  const snapshot = createObservationSnapshot()
  observationListeners.forEach((listener) => listener(snapshot))
}

function mergeUnique(values: string[], nextValue: string | null | undefined) {
  if (!nextValue || values.includes(nextValue)) {
    return values
  }

  return [...values, nextValue]
}

function recordResourceLoad(options: {
  source: AtlasLoadSource
  resourceKey: string
  bytes?: number
  countyDetailId?: string
  townshipCountyId?: string
}) {
  const nextSizes = { ...loadObservationState.resourceSizes }
  if (typeof options.bytes === 'number' && options.bytes > 0) {
    nextSizes[options.resourceKey] = options.bytes
  }

  loadObservationState = {
    ...loadObservationState,
    loadedCountyDetails: mergeUnique(loadObservationState.loadedCountyDetails, options.countyDetailId),
    loadedTownshipSlices: mergeUnique(loadObservationState.loadedTownshipSlices, options.townshipCountyId),
    cacheHits:
      loadObservationState.cacheHits + (options.source === 'memory' || options.source === 'indexeddb' ? 1 : 0),
    memoryHits: loadObservationState.memoryHits + (options.source === 'memory' ? 1 : 0),
    indexedDbHits: loadObservationState.indexedDbHits + (options.source === 'indexeddb' ? 1 : 0),
    networkFetches: loadObservationState.networkFetches + (options.source === 'network' ? 1 : 0),
    totalTransferredBytes:
      loadObservationState.totalTransferredBytes + (options.source === 'network' ? options.bytes ?? 0 : 0),
    resourceSizes: nextSizes,
    lastLoadSource: options.source,
  }

  emitObservation()
}

function detectCountyIdFromDetailFile(detailFile: string) {
  return countyDetailFileLookup.get(detailFile) ?? detailFile.replace(/^counties\//, '').replace(/\.json$/, '')
}

function detectCountyIdFromTownshipFile(townshipFile: string) {
  return townshipFileLookup.get(townshipFile) ?? townshipFile.replace(/^townships\//, '').replace(/\.topo\.json$/, '')
}

function toCountyDetailResourceKey(detailFile: string) {
  return `county-detail:${detailFile}`
}

function toTownshipBoundaryResourceKey(townshipFile: string) {
  return `township-boundary:${townshipFile}`
}

function toSummaryResourceKey() {
  return 'summary:education-summary.json'
}

function toCountyBoundaryResourceKey() {
  return 'county-boundary:county-boundaries.topo.json'
}

function byteLengthOfText(text: string) {
  return new TextEncoder().encode(text).length
}

function openAtlasDb() {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve<IDBDatabase | null>(null)
  }

  return new Promise<IDBDatabase | null>((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(RESOURCE_STORE)) {
        database.createObjectStore(RESOURCE_STORE, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

async function readPersistedResource<T>(key: string) {
  const database = await openAtlasDb()
  if (!database) {
    return null
  }

  return new Promise<PersistedResource<T> | null>((resolve) => {
    const transaction = database.transaction(RESOURCE_STORE, 'readonly')
    const request = transaction.objectStore(RESOURCE_STORE).get(key)

    request.onsuccess = () => {
      resolve((request.result as PersistedResource<T> | undefined) ?? null)
    }
    request.onerror = () => resolve(null)
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => database.close()
  })
}

async function writePersistedResource<T>(key: string, value: T) {
  const database = await openAtlasDb()
  if (!database) {
    return
  }

  await new Promise<void>((resolve) => {
    const transaction = database.transaction(RESOURCE_STORE, 'readwrite')
    transaction.objectStore(RESOURCE_STORE).put({
      key,
      value,
      updatedAt: new Date().toISOString(),
    } satisfies PersistedResource<T>)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      resolve()
    }
  })
}

async function fetchJsonWithMetrics<T>(resourcePath: string) {
  const response = await fetch(resourcePath)

  if (!response.ok) {
    throw new Error(`無法載入資料 (${response.status})`)
  }

  const text = await response.text()
  return {
    value: JSON.parse(text) as T,
    bytes: byteLengthOfText(text),
  }
}

export function getAtlasLoadObservations() {
  return createObservationSnapshot()
}

export function subscribeAtlasLoadObservations(listener: (snapshot: AtlasLoadObservationSnapshot) => void) {
  observationListeners.add(listener)
  listener(createObservationSnapshot())

  return () => {
    observationListeners.delete(listener)
  }
}

export async function loadEducationSummary() {
  if (summaryCache) {
    recordResourceLoad({
      source: 'memory',
      resourceKey: toSummaryResourceKey(),
      bytes: summaryCache.assetMetrics?.summaryBytes,
    })
    return summaryCache
  }

  const resourceKey = toSummaryResourceKey()
  const persisted = await readPersistedResource<EducationSummaryDataset>(resourceKey)
  if (persisted?.value) {
    summaryCache = persisted.value
    countyDetailFileLookup.clear()
    townshipFileLookup.clear()
    persisted.value.counties.forEach((county) => {
      countyDetailFileLookup.set(county.detailFile, county.id)
      townshipFileLookup.set(county.townshipFile, county.id)
    })
    recordResourceLoad({
      source: 'indexeddb',
      resourceKey,
      bytes: persisted.value.assetMetrics?.summaryBytes,
    })
    return persisted.value
  }

  const { value, bytes } = await fetchJsonWithMetrics<EducationSummaryDataset>('/data/education-summary.json')
  summaryCache = value
  countyDetailFileLookup.clear()
  townshipFileLookup.clear()
  value.counties.forEach((county) => {
    countyDetailFileLookup.set(county.detailFile, county.id)
    townshipFileLookup.set(county.townshipFile, county.id)
  })
  recordResourceLoad({
    source: 'network',
    resourceKey,
    bytes,
  })
  void writePersistedResource(resourceKey, value)

  return value
}

export async function loadCountyDetail(detailFile: string, countyId?: string) {
  const resourceKey = toCountyDetailResourceKey(detailFile)
  const resolvedCountyId = countyId ?? detectCountyIdFromDetailFile(detailFile)

  if (countyDetailMemoryCache.has(detailFile)) {
    recordResourceLoad({
      source: 'memory',
      resourceKey,
      countyDetailId: resolvedCountyId,
    })
    return countyDetailMemoryCache.get(detailFile) as CountyDetailDataset
  }

  const pendingRequest = pendingCountyDetailRequests.get(detailFile)
  if (pendingRequest) {
    return pendingRequest
  }

  const nextRequest = (async () => {
    const persisted = await readPersistedResource<CountyDetailDataset>(resourceKey)
    if (persisted?.value) {
      countyDetailMemoryCache.set(detailFile, persisted.value)
      recordResourceLoad({
        source: 'indexeddb',
        resourceKey,
        countyDetailId: resolvedCountyId,
      })
      return persisted.value
    }

    const { value, bytes } = await fetchJsonWithMetrics<CountyDetailDataset>(`/data/${detailFile}`)
    countyDetailMemoryCache.set(detailFile, value)
    recordResourceLoad({
      source: 'network',
      resourceKey: detailFile,
      bytes,
      countyDetailId: resolvedCountyId,
    })
    void writePersistedResource(resourceKey, value)
    return value
  })()

  pendingCountyDetailRequests.set(detailFile, nextRequest)

  try {
    return await nextRequest
  } finally {
    pendingCountyDetailRequests.delete(detailFile)
  }
}

export async function loadCountyBoundaries() {
  if (countyBoundaryCache) {
    recordResourceLoad({
      source: 'memory',
      resourceKey: toCountyBoundaryResourceKey(),
    })
    return countyBoundaryCache
  }

  const resourceKey = toCountyBoundaryResourceKey()
  const persisted = await readPersistedResource<CountyBoundaryCollection>(resourceKey)
  if (persisted?.value) {
    countyBoundaryCache = persisted.value
    recordResourceLoad({
      source: 'indexeddb',
      resourceKey,
    })
    return persisted.value
  }

  const { value, bytes } = await fetchJsonWithMetrics<TopologyCollection>('/data/county-boundaries.topo.json')
  countyBoundaryCache = decodeFeatureCollection<CountyBoundaryProperties>(value, 'counties')
  recordResourceLoad({
    source: 'network',
    resourceKey,
    bytes,
  })
  void writePersistedResource(resourceKey, countyBoundaryCache)
  return countyBoundaryCache
}

export async function loadTownshipBoundaries(countyId: string, townshipFile?: string) {
  const resolvedTownshipFile = townshipFile ?? `townships/${countyId}.topo.json`
  const resourceKey = toTownshipBoundaryResourceKey(resolvedTownshipFile)
  const resolvedCountyId = detectCountyIdFromTownshipFile(resolvedTownshipFile)

  if (townshipBoundaryMemoryCache.has(resolvedCountyId)) {
    recordResourceLoad({
      source: 'memory',
      resourceKey,
      townshipCountyId: resolvedCountyId,
    })
    return townshipBoundaryMemoryCache.get(resolvedCountyId) as TownshipBoundaryCollection
  }

  const pendingRequest = pendingTownshipBoundaryRequests.get(resolvedCountyId)
  if (pendingRequest) {
    return pendingRequest
  }

  const nextRequest = (async () => {
    const persisted = await readPersistedResource<TownshipBoundaryCollection>(resourceKey)
    if (persisted?.value) {
      townshipBoundaryMemoryCache.set(resolvedCountyId, persisted.value)
      recordResourceLoad({
        source: 'indexeddb',
        resourceKey,
        townshipCountyId: resolvedCountyId,
      })
      return persisted.value
    }

    const { value, bytes } = await fetchJsonWithMetrics<TopologyCollection>(`/data/${resolvedTownshipFile}`)
    const decoded = decodeFeatureCollection<TownshipBoundaryProperties>(value, 'townships')
    townshipBoundaryMemoryCache.set(resolvedCountyId, decoded)
    recordResourceLoad({
      source: 'network',
      resourceKey: resolvedTownshipFile,
      bytes,
      townshipCountyId: resolvedCountyId,
    })
    void writePersistedResource(resourceKey, decoded)
    return decoded
  })()

  pendingTownshipBoundaryRequests.set(resolvedCountyId, nextRequest)

  try {
    return await nextRequest
  } finally {
    pendingTownshipBoundaryRequests.delete(resolvedCountyId)
  }
}

export async function prefetchCountyResources(
  county: Pick<CountySummaryRecord, 'id' | 'detailFile' | 'townshipFile'>,
  options?: {
    includeTownshipSlice?: boolean
  },
) {
  const tasks: Array<Promise<unknown>> = [loadCountyDetail(county.detailFile, county.id)]
  if (options?.includeTownshipSlice) {
    tasks.push(loadTownshipBoundaries(county.id, county.townshipFile))
  }

  await Promise.allSettled(tasks)
}