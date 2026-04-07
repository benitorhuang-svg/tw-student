import type { FeatureCollection, Geometry } from 'geojson'

import { feature } from 'topojson-client'

import { loadDatabase } from './sqlite/connection'
import { mapRows, parseJsonValue } from './sqlite/mappers'
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

let countyBoundaryCache: CountyBoundaryCollection | null = null
const townshipBoundaryMemoryCache = new Map<string, TownshipBoundaryCollection>()
const pendingTownshipBoundaryRequests = new Map<string, Promise<TownshipBoundaryCollection>>()

type BoundaryLoadOptions = {
  forceRefresh?: boolean
}

const EMPTY_TOPOLOGY: TopologyCollection = {
  type: 'Topology',
  objects: {},
  arcs: [],
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

// 移除不再需要的網路抓取函數，現在統一由 SQLite 讀取



export async function loadCountyBoundaries(options: BoundaryLoadOptions = {}) {
  if (options.forceRefresh) {
    countyBoundaryCache = null
  }

  if (countyBoundaryCache) {
    return countyBoundaryCache
  }

  const { db } = await loadDatabase(options)
  const rows = mapRows(db.exec("SELECT topology_json FROM boundaries WHERE id = 'counties' AND type = 'county'"))
  const topologyJson = rows[0]?.topology_json as string
  if (!topologyJson) throw new Error('找不到縣市邊界資料庫紀錄')

  const value = parseJsonValue<TopologyCollection>(topologyJson, EMPTY_TOPOLOGY)
  countyBoundaryCache = decodeFeatureCollection<CountyBoundaryProperties>(value, 'counties')
  return countyBoundaryCache
}

export async function loadTownshipBoundaries(countyId: string, _townshipFile?: string, options: BoundaryLoadOptions = {}) {

  if (options.forceRefresh) {
    townshipBoundaryMemoryCache.delete(countyId)
    pendingTownshipBoundaryRequests.delete(countyId)
  }

  if (townshipBoundaryMemoryCache.has(countyId)) {
    return townshipBoundaryMemoryCache.get(countyId) as TownshipBoundaryCollection
  }

  const pendingRequest = pendingTownshipBoundaryRequests.get(countyId)
  if (pendingRequest) {
    return pendingRequest
  }

  const nextRequest = (async () => {
    const { db } = await loadDatabase(options)
    const rows = mapRows(db.exec('SELECT topology_json FROM boundaries WHERE id = ? AND type = "township"', [countyId]))
    const topologyJson = rows[0]?.topology_json as string
    if (!topologyJson) throw new Error(`找不到鄉鎮邊界資料庫紀錄：${countyId}`)

    const value = parseJsonValue<TopologyCollection>(topologyJson, EMPTY_TOPOLOGY)
    const decoded = decodeFeatureCollection<TownshipBoundaryProperties>(value, 'townships')
    townshipBoundaryMemoryCache.set(countyId, decoded)
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