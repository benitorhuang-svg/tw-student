import { feature } from 'topojson-client'

self.addEventListener('message', (ev) => {
  const { id, payload } = ev.data || {}
  try {
    const { topologyJson, objectName } = payload || {}
    const topology = typeof topologyJson === 'string' ? JSON.parse(topologyJson) : topologyJson
    const obj = topology.objects && topology.objects[objectName] ? topology.objects[objectName] : Object.values(topology.objects)[0]
    const fc = feature(topology, obj)
    // serialize to a transferable ArrayBuffer to reduce structured-clone overhead
    const json = JSON.stringify(fc)
    const enc = new TextEncoder()
    const buf = enc.encode(json)
    ;(self as any).postMessage({ id, resultBuf: buf.buffer }, [buf.buffer])
  } catch (err) {
    ;(self as any).postMessage({ id, error: String(err && err.message ? err.message : err) })
  }
})

export {}
