import { getDatabaseUrl } from './connection'

let worker: Worker | null = null
let ready = false
let initPromise: Promise<number> | null = null
let nextId = 1
const pending = new Map<number, { resolve: (v:any)=>void, reject:(e:any)=>void }>()

function ensureWorker() {
  if (worker) return worker
  worker = new Worker(new URL('../../workers/sqlWorker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (ev) => {
    const { id, result, error, type } = ev.data || {}
    if (type === 'ready') {
      ready = true
      return
    }
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

export async function initSqliteWorker(forceRefresh = false) {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const w = ensureWorker()
    const url = getDatabaseUrl(forceRefresh)
    const resp = await fetch(url, { cache: forceRefresh ? 'no-store' : 'default' })
    if (!resp.ok) throw new Error(`Failed to fetch sqlite db: ${resp.status}`)
    const buffer = await resp.arrayBuffer()
    // Transfer the buffer to the worker
    w.postMessage({ type: 'init', buffer }, [buffer])
    // wait for ready signal (best-effort)
    const timeout = 5000
    const start = Date.now()
    while (!ready && Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 50))
    }
    return buffer.byteLength
  })()
  return initPromise
}

export async function execInSqlite(sql: string, params?: any[]): Promise<any> {
  ensureWorker()
  await initSqliteWorker()
  return new Promise<any>((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    worker!.postMessage({ id, type: 'exec', sql, params })
  })
}
