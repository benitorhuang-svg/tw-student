type TopologyWorkerPayload = {
  topologyJson: string
  objectName: string
}

type PendingRequest<T> = {
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

type TopologyWorkerResponse<T> = {
  id?: number
  result?: T
  resultBuf?: unknown
  error?: string
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, PendingRequest<unknown>>()

function ensure() {
  if (worker) return worker
  worker = new Worker(new URL('../../workers/processTopologyWorker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (ev: MessageEvent<TopologyWorkerResponse<unknown>>) => {
    const { id, result, resultBuf, error } = ev.data || {}
    if (id == null) return
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    if (error) entry.reject(new Error(error))
    else if (resultBuf) {
      // resultBuf is now the direct structured-cloned object
      entry.resolve(resultBuf)
    } else entry.resolve(result)
  })
  worker.addEventListener('error', (err) => {
    pending.forEach((request) => request.reject(err))
    pending.clear()
  })
  return worker
}

export async function decodeTopologyInWorker<T>({ topologyJson, objectName }: TopologyWorkerPayload): Promise<T> {
  if (typeof Worker === 'undefined') {
    const { feature } = await import('topojson-client')
    const topologyInput = typeof topologyJson === 'string' ? JSON.parse(topologyJson) : topologyJson
    const objects = topologyInput.objects
    const obj = objectName && objects[objectName] ? objects[objectName] : Object.values(objects)[0]
    return feature(topologyInput, obj) as T
  }

  ensure()
  return new Promise<T>((resolve, reject) => {
    const id = nextId++
    pending.set(id, {
      resolve: (value) => resolve(value as T),
      reject,
    })
    worker!.postMessage({ id, payload: { topologyJson, objectName } })
  })
}
