import type { EducationSummaryDataset } from '../educationTypes'

type SummaryWorkerPayload = Record<string, unknown>

type PendingRequest<T> = {
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

type WorkerResponse<T> = {
  id?: number
  result?: T
  resultString?: string
  error?: string
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, PendingRequest<unknown>>()

function ensureWorker() {
  if (worker) return worker
  worker = new Worker(new URL('../../workers/processSummaryWorker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (ev: MessageEvent<WorkerResponse<unknown>>) => {
    const { id, result, error } = ev.data || {}
    if (id == null) return
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    if (error) entry.reject(new Error(error))
    else entry.resolve(ev.data.resultString ? JSON.parse(ev.data.resultString) : result)
  })
  worker.addEventListener('error', (err) => {
    pending.forEach((p) => p.reject(err))
    pending.clear()
  })
  return worker
}

export function processSummaryInWorker(payload: SummaryWorkerPayload): Promise<EducationSummaryDataset> {
  return processInSummaryWorker<EducationSummaryDataset>(payload)
}

export function processSchoolCodeIndexInWorker(
  payload: SummaryWorkerPayload,
): Promise<NonNullable<EducationSummaryDataset['schoolCodeIndex']>> {
  return processInSummaryWorker<NonNullable<EducationSummaryDataset['schoolCodeIndex']>>({
    ...payload,
    task: 'schoolCodeIndex',
  })
}

function processInSummaryWorker<T>(payload: SummaryWorkerPayload): Promise<T> {
  ensureWorker()
  return new Promise<T>((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject })
    worker!.postMessage({ id, payload })
  })
}
