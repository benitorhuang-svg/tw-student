let worker: Worker | null = null
let nextId = 1
const pending = new Map()

function ensureWorker() {
  if (worker) return worker
  worker = new Worker(new URL('../../workers/processSummaryWorker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (ev) => {
    const { id, result, error } = ev.data || {}
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    if (error) entry.reject(new Error(error))
    else entry.resolve(result)
  })
  worker.addEventListener('error', (err) => {
    pending.forEach((p) => p.reject(err))
    pending.clear()
  })
  return worker
}

export function processSummaryInWorker(payload) {
  ensureWorker()
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    worker.postMessage({ id, payload })
  })
}
