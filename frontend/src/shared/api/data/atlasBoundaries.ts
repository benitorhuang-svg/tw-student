import type { FeatureCollection, Geometry } from 'geojson'

// Topology decoding is offloaded to a worker to avoid main-thread topojson work
import { decodeTopologyInWorker } from './atlas/topologyWorkerClient'
import { buildDataAssetUrl } from './dataAsset'
import { recordResourceLoad } from './atlasLoadObservation'
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

async function decodeFeatureCollection<TProperties>(
  topology: TopologyCollection | string,
  objectName: string,
): Promise<FeatureCollection<Geometry, TProperties>> {
  const topologyJson = typeof topology === 'string' ? topology : JSON.stringify(topology)
  // delegate to worker
  return decodeTopologyInWorker<FeatureCollection<Geometry, TProperties>>({ topologyJson, objectName })
}

export async function loadCountyBoundaries(options: BoundaryLoadOptions = {}) {
  if (options.forceRefresh) {
    countyBoundaryCache = null
  }

  if (countyBoundaryCache) {
    return countyBoundaryCache
  }

  // 第一階層 (Tier 1)：優先以非阻塞 HTTP 載入預量化的 counties.topo.json (~50KB gzipped)
  try {
    const topoUrl = buildDataAssetUrl('counties.topo.json', options.forceRefresh)
    const response = await fetch(topoUrl)
    if (response.ok) {
      const topologyJson = await response.text()
      countyBoundaryCache = await decodeFeatureCollection<CountyBoundaryProperties>(topologyJson, 'counties')
      const contentLength = response.headers.get('content-length')
      recordResourceLoad({
        source: 'network',
        resourceKey: 'counties.topo.json',
        bytes: contentLength ? Number(contentLength) : topologyJson.length,
      })
      return countyBoundaryCache
    }
  } catch {
    // 降級至 SQLite 資料庫讀取
  }

  // 第二階層 (Tier 2)：降級至 SQLite 資料庫
  await import('./sqlite/sqliteWorkerClient').then((m) => m.initSqliteWorker(options.forceRefresh))
  const rows = mapRows(await import('./sqlite/sqliteWorkerClient').then((m) => m.execInSqlite("SELECT topology_json FROM boundaries WHERE id = 'counties' AND type = 'county'")))
  const topologyJson = rows[0]?.topology_json as string
  if (!topologyJson) throw new Error('找不到縣市邊界資料庫紀錄')

  parseJsonValue<TopologyCollection>(topologyJson, EMPTY_TOPOLOGY)
  countyBoundaryCache = await decodeFeatureCollection<CountyBoundaryProperties>(topologyJson, 'counties')
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
    await import('./sqlite/sqliteWorkerClient').then((m) => m.initSqliteWorker(options.forceRefresh))
    const rows = mapRows(await import('./sqlite/sqliteWorkerClient').then((m) => m.execInSqlite('SELECT topology_json FROM boundaries WHERE id = ? AND type = "township"', [countyId])))
    const topologyJson = rows[0]?.topology_json as string
    if (!topologyJson) throw new Error(`找不到鄉鎮邊界資料庫紀錄：${countyId}`)

    parseJsonValue<TopologyCollection>(topologyJson, EMPTY_TOPOLOGY)
    const decoded = await decodeFeatureCollection<TownshipBoundaryProperties>(topologyJson, 'townships')
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
