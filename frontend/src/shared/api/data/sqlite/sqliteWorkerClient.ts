import { getDatabaseUrl } from './connection'

type SqlQueryResult = Array<{ columns: string[]; values: unknown[][] }>

type PendingRequest<T> = {
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

type SqlWorkerResponse = {
  id?: number
  result?: SqlQueryResult
  error?: string
  type?: 'ready'
}

let worker: Worker | null = null
let ready = false
let initError: Error | null = null
let initPromise: Promise<number> | null = null
let nextId = 1
const pending = new Map<number, PendingRequest<SqlQueryResult>>()

function ensureWorker() {
  if (worker) return worker
  worker = new Worker(new URL('../../workers/sqlWorker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (ev: MessageEvent<SqlWorkerResponse>) => {
    const { id, result, error, type } = ev.data || {}
    if (type === 'ready') {
      ready = true
      return
    }
    if (error && typeof id !== 'number') {
      initError = new Error(error)
      console.error('SQLite Worker Init Error:', error)
      return
    }
    if (typeof id !== 'number') return
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    if (error) entry.reject(new Error(error))
    else if (result) entry.resolve(result)
    else entry.reject(new Error('SQLite worker returned an empty result'))
  })
  worker.addEventListener('error', (err) => {
    pending.forEach((p) => p.reject(err))
    pending.clear()
  })
  return worker
}

export async function initSqliteWorker(forceRefresh = false) {
  if (forceRefresh) {
    resetSqliteWorker()
  }
  if (initPromise) return initPromise
  initPromise = (async () => {
    const w = ensureWorker()
    const url = getDatabaseUrl(forceRefresh)
    // Send the URL to the worker to fetch and store in OPFS directly
    w.postMessage({ type: 'init', url, forceRefresh })

    // wait for ready signal
    const timeout = 15000 // downloading 43MB could take a few seconds
    const start = Date.now()
    while (!ready && !initError && Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 100))
    }

    if (initError) {
      throw initError
    }

    if (!ready) {
      console.warn('SQLite worker initialization timed out or took longer than 15s')
    }

    return 1 // arbitrary size indicator, since we don't hold the buffer anymore
  })()
  return initPromise
}

export async function warmAtlasRuntime() {
  try {
    await initSqliteWorker(false)
  } catch {
    // Runtime warm-up is best-effort; foreground data loading reports real failures.
  }
}

export async function execInSqlite(sql: string, params?: unknown[]): Promise<SqlQueryResult> {
  await initSqliteWorker()
  const activeWorker = ensureWorker()
  return new Promise<SqlQueryResult>((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    activeWorker.postMessage({ id, type: 'exec', sql, params })
  })
}

export function resetSqliteWorker() {
  pending.forEach((request) => request.reject(new Error('SQLite worker reset')))
  pending.clear()
  worker?.terminate()
  worker = null
  ready = false
  initError = null
  initPromise = null
}
