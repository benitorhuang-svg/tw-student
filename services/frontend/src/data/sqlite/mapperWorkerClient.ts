// Client wrapper to interact with the processCountyWorker
let worker: Worker | null = null
const pending = new Map<number, { resolve: (v:any)=>void, reject:(e:any)=>void }>()
let nextId = 1

function ensureWorker() {
  if (worker) return worker
  // Worker path relative to this file: ../../workers/processCountyWorker.ts
  worker = new Worker(new URL('../../workers/processCountyWorker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (ev) => {
    const { id, result, error } = ev.data || {}
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    if (error) entry.reject(new Error(error))
    else entry.resolve(result)
  })
  worker.addEventListener('error', (err) => {
    // reject all pending
    pending.forEach((p) => p.reject(err))
    pending.clear()
  })
  return worker
}

export function processCountyRowsInWorker(args: { schoolRows:any[], yearRows:any[], compositionSummaryRows:any[], compositionRows:any[] }) {
  ensureWorker()
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    worker!.postMessage({ id, ...args })
  })
}
