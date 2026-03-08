import type { FeatureCollection, Geometry } from 'geojson'

import { feature } from 'topojson-client'

import { recordResourceLoad } from './atlasLoadObservation'
import type {
  CountyBoundaryCollection,
  CountyBoundaryProperties,
  TownshipBoundaryCollection,
  TownshipBoundaryProperties,
} from './educationTypes'

type TopologyCollection = {
  type: 'Topology'
  objects: Record<string, unknown>
  arcs: unknown[]
  transform?: {
    scale: [number, number]
    translate: [number, number]
  }
}

const DATA_BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, '')
let countyBoundaryCache: CountyBoundaryCollection | null = null
const townshipBoundaryMemoryCache = new Map<string, TownshipBoundaryCollection>()
const pendingTownshipBoundaryRequests = new Map<string, Promise<TownshipBoundaryCollection>>()

type BoundaryLoadOptions = {
  forceRefresh?: boolean
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

function byteLengthOfText(text: string) {
  return new TextEncoder().encode(text).length
}

async function fetchJsonWithMetrics<T>(resourcePath: string, options: BoundaryLoadOptions = {}) {
  const url = resourcePath.startsWith('/') ? `${DATA_BASE_URL}${resourcePath}` : `${DATA_BASE_URL}/${resourcePath}`
  const resolvedUrl = options.forceRefresh ? `${url}${url.includes('?') ? '&' : '?'}refresh=${Date.now()}` : url
  const response = await fetch(resolvedUrl, {
    cache: options.forceRefresh ? 'no-store' : 'default',
  })

  if (!response.ok) {
    throw new Error(`無法載入資料 (${response.status})`)
  }

  const text = await response.text()
  return {
    value: JSON.parse(text) as T,
    bytes: byteLengthOfText(text),
  }
}

function toCountyBoundaryResourceKey() {
  return 'county-boundary:county-boundaries.topo.json'
}

function toTownshipBoundaryResourceKey(townshipFile: string) {
  return `township-boundary:${townshipFile}`
}

export async function loadCountyBoundaries(options: BoundaryLoadOptions = {}) {
  if (options.forceRefresh) {
    countyBoundaryCache = null
  }

  if (countyBoundaryCache) {
    recordResourceLoad({
      source: 'memory',
      resourceKey: toCountyBoundaryResourceKey(),
    })
    return countyBoundaryCache
  }

  const { value, bytes } = await fetchJsonWithMetrics<TopologyCollection>('/data/county-boundaries.topo.json', options)
  countyBoundaryCache = decodeFeatureCollection<CountyBoundaryProperties>(value, 'counties')
  recordResourceLoad({
    source: 'network',
    resourceKey: toCountyBoundaryResourceKey(),
    bytes,
  })
  return countyBoundaryCache
}

export async function loadTownshipBoundaries(countyId: string, townshipFile?: string, options: BoundaryLoadOptions = {}) {
  const resolvedTownshipFile = townshipFile ?? `townships/${countyId}.topo.json`
  const resourceKey = toTownshipBoundaryResourceKey(resolvedTownshipFile)

  if (options.forceRefresh) {
    townshipBoundaryMemoryCache.delete(countyId)
    pendingTownshipBoundaryRequests.delete(countyId)
  }

  if (townshipBoundaryMemoryCache.has(countyId)) {
    recordResourceLoad({
      source: 'memory',
      resourceKey,
      townshipCountyId: countyId,
    })
    return townshipBoundaryMemoryCache.get(countyId) as TownshipBoundaryCollection
  }

  const pendingRequest = pendingTownshipBoundaryRequests.get(countyId)
  if (pendingRequest) {
    return pendingRequest
  }

  const nextRequest = (async () => {
    const { value, bytes } = await fetchJsonWithMetrics<TopologyCollection>(`/data/${resolvedTownshipFile}`, options)
    const decoded = decodeFeatureCollection<TownshipBoundaryProperties>(value, 'townships')
    townshipBoundaryMemoryCache.set(countyId, decoded)
    recordResourceLoad({
      source: 'network',
      resourceKey,
      bytes,
      townshipCountyId: countyId,
    })
    return decoded
  })()

  pendingTownshipBoundaryRequests.set(countyId, nextRequest)

  try {
    return await nextRequest
  } finally {
    pendingTownshipBoundaryRequests.delete(countyId)
  }
}

export function resetAtlasBoundaryCaches() {
  countyBoundaryCache = null
  townshipBoundaryMemoryCache.clear()
  pendingTownshipBoundaryRequests.clear()
}