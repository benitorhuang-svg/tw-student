import { feature } from 'topojson-client'
import type { GeometryObject, Topology } from 'topojson-specification'

type TopologyWorkerPayload = {
  topologyJson?: string | object
  objectName?: string
}

type TopologyWorkerMessage = {
  id?: number
  payload?: TopologyWorkerPayload
}

type TopologyWithObjects = Topology<Record<string, GeometryObject>>

const workerScope = self as unknown as {
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

self.addEventListener('message', (ev) => {
  const { id, payload } = (ev.data || {}) as TopologyWorkerMessage
  try {
    const { topologyJson, objectName } = payload || {}
    const topologyInput = typeof topologyJson === 'string' ? JSON.parse(topologyJson) : topologyJson
    if (!topologyInput || typeof topologyInput !== 'object' || !('objects' in topologyInput)) {
      throw new Error('Topology payload is missing objects')
    }
    const topology = topologyInput as TopologyWithObjects
    const objects = topology.objects
    const obj = objectName && objects[objectName] ? objects[objectName] : Object.values(objects)[0]
    if (!obj) throw new Error('Topology payload has no convertible object')
    const fc = feature(topology, obj)
    // serialize to a transferable ArrayBuffer to reduce structured-clone overhead
    const json = JSON.stringify(fc)
    const enc = new TextEncoder()
    const buf = enc.encode(json)
    workerScope.postMessage({ id, resultBuf: buf.buffer }, [buf.buffer])
  } catch (err) {
    workerScope.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
})

export {}
