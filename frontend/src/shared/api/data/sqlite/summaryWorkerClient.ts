import type { EducationSummaryDataset } from '../educationTypes'

type SummaryWorkerPayload = Record<string, unknown>

type PendingRequest<T> = {
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

type WorkerResponse<T> = {
  id?: number
  result?: T
  error?: string
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, PendingRequest<EducationSummaryDataset>>()

function ensureWorker() {
  if (worker) return worker
  worker = new Worker(new URL('../../workers/processSummaryWorker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (ev: MessageEvent<WorkerResponse<EducationSummaryDataset>>) => {
    const { id, result, error } = ev.data || {}
    if (id == null) return
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    if (error) entry.reject(new Error(error))
    else if (result) entry.resolve(result)
  })
  worker.addEventListener('error', (err) => {
    pending.forEach((p) => p.reject(err))
    pending.clear()
  })
  return worker
}

export function processSummaryInWorker(payload: SummaryWorkerPayload): Promise<EducationSummaryDataset> {
  ensureWorker()
  return new Promise<EducationSummaryDataset>((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    worker!.postMessage({ id, payload })
  })
}
