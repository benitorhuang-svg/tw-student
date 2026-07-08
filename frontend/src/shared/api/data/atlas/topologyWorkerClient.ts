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
  resultBuf?: ArrayBuffer
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
    pending.forEach((request) => request.reject(err))
    pending.clear()
  })
  return worker
}

export function decodeTopologyInWorker<T>({ topologyJson, objectName }: TopologyWorkerPayload): Promise<T> {
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
