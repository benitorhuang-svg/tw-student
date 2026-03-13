import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { useMap, useMapEvents } from 'react-leaflet'
import type { RankingSummary } from '../../../lib/analytics'
import type { BaseRow, WorkerResult } from '../townshipCollisionWorker'

// worker bundling via Vite
const createWorker = () => new Worker(new URL('../townshipCollisionWorker.ts', import.meta.url))

export type CanvasTownshipLayerProps = {
  townshipRows: RankingSummary[]
  activeTownshipId: string | null
  townshipCenterLookup: Map<string, [number, number]>
  onSelectTownship: (townshipId: string, options?: { skipTabSwitch?: boolean }) => void
  variant?: 'compact' | 'full'
}

function CanvasTownshipLayer({
  townshipRows,
  activeTownshipId,
  townshipCenterLookup,
  onSelectTownship,
  variant = 'compact',
}: CanvasTownshipLayerProps) {
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const [visibleRows, setVisibleRows] = useState<BaseRow[]>([])

  // initialize canvas and event listeners
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.pointerEvents = 'none' // we'll handle clicks separately
    canvas.className = 'atlas-township-canvas-layer'
    const pane = map.getPane('overlayPane')!
    pane.appendChild(canvas)
    canvasRef.current = canvas

    const resize = () => {
      if (!canvas) return
      const size = map.getSize()
      canvas.width = size.x
      canvas.height = size.y
      draw() // redraw on resize
    }

    map.on('move zoom resize', resize)
    resize()

    return () => {
      map.off('move zoom resize', resize)
      pane.removeChild(canvas)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // click handling: translate pixel to township
  useEffect(() => {
    const handle = (e: L.LeafletMouseEvent) => {
      if (!canvasRef.current) return
      const pt = e.containerPoint
      // naive nearest neighbor search among visibleRows
      let best: BaseRow | null = null
      let bestDist = Infinity
      for (const r of visibleRows) {
        const dx = pt.x - r.point.x
        const dy = pt.y - r.point.y
        const dsq = dx * dx + dy * dy
        if (dsq < bestDist) {
          bestDist = dsq
          best = r
        }
      }
      if (best && Math.sqrt(bestDist) < (variant === 'compact' ? 16 : 24)) {
        onSelectTownship(best.township.id, { skipTabSwitch: true })
      }
    }
    map.on('click', handle)
    return () => {
      map.off('click', handle)
    }
  }, [map, visibleRows, onSelectTownship, variant])

  // recompute baseRows & send to worker when bounds/zoom/data change
  useMapEvents({
    moveend: computeVisible,
    zoomend: computeVisible,
  })

  function computeVisible() {
    const zoom = map.getZoom()
    const baseRows: BaseRow[] = townshipRows
      .filter((t) => t.id !== activeTownshipId)
      .map((township) => {
        const center = townshipCenterLookup.get(township.id)
        if (!center) return null
        const at = map.latLngToContainerPoint(center)
        const point = { x: at.x, y: at.y }
        const box = getTownshipCollisionBox(township.label, variant, zoom)
        return { township, center, point, width: box.width, height: box.height }
      })
      .filter((entry): entry is BaseRow => entry !== null)

    if (!workerRef.current) workerRef.current = createWorker()
    workerRef.current.onmessage = (e: MessageEvent<WorkerResult>) => {
      if (e.data?.type === 'result') {
        setVisibleRows(e.data.visible)
        draw()
      }
    }
    workerRef.current.postMessage({ type: 'compute', rows: baseRows, zoom })
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear every frame
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render township labels for all visible rows (no collision filtering).
    // This is intentionally dense so the map always shows all labels in view.
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 12px "Noto Sans TC", sans-serif'

    for (const row of visibleRows) {
      const { x, y } = row.point
      const label = row.township.label

      // Draw a subtle background pill behind the label to improve readability
      const padding = 6
      const textWidth = ctx.measureText(label).width
      const boxWidth = textWidth + padding * 2
      const boxHeight = 20

      ctx.fillStyle = 'rgba(8, 17, 31, 0.75)'
      ctx.beginPath()
      ctx.roundRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight, 10)
      ctx.fill()

      ctx.fillStyle = '#f8fafc'
      ctx.fillText(label, x, y)
    }
  }

  return null
}

function getTownshipCollisionBox(label: string, variant: 'compact' | 'full', zoom: number) {
  const width = variant === 'compact'
    ? Math.min(88, 26 + label.length * 13)
    : Math.min(148, 40 + label.length * 15)
  const height = variant === 'compact'
    ? (zoom >= 12 ? 22 : 20)
    : (zoom >= 12 ? 32 : 28)

  return { width, height }
}

export default CanvasTownshipLayer
