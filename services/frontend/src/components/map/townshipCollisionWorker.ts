import type { RankingSummary } from '../../lib/analytics'

// Data structure passed from main thread AFTER container points have been calculated.
export type BaseRow = {
  township: RankingSummary
  center: [number, number]
  point: { x: number; y: number }
  width: number
  height: number
}

export type WorkerMessage =
  | { type: 'compute'; rows: BaseRow[]; zoom: number }

export type WorkerResult = { type: 'result'; visible: BaseRow[] }

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === 'compute') {
    const { rows } = e.data

    // Return all rows (sorted by student count) so labels can render
    // for every township in view.
    const visible = [...rows].sort((a, b) => b.township.students - a.township.students)

    const msg: WorkerResult = { type: 'result', visible }
    const ctx = self as unknown as { postMessage: (msg: WorkerResult) => void }
    ctx.postMessage(msg)
  }
}
