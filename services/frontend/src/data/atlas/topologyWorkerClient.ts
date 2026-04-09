let worker: Worker | null = null
let nextId = 1
const pending = new Map()

function ensure() {
  if (worker) return worker
  worker = new Worker(new URL('../../workers/processTopologyWorker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (ev) => {
    const { id, result, resultBuf, error } = ev.data || {}
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    if (error) entry.reject(new Error(error))
    else if (resultBuf) {
      try {
        const arr = new Uint8Array(resultBuf)
        const json = new TextDecoder().decode(arr)
        const parsed = JSON.parse(json)
        entry.resolve(parsed)
      } catch (err) {
        entry.reject(err)
      }
    } else entry.resolve(result)
  })
  worker.addEventListener('error', (err) => {
    pending.forEach((p) => p.reject(err))
    pending.clear()
  })
  return worker
}

export function decodeTopologyInWorker({ topologyJson, objectName }: { topologyJson: string; objectName: string }) {
  ensure()
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    worker!.postMessage({ id, payload: { topologyJson, objectName } })
  })
}
