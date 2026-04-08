import { useEffect, useRef, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { SchoolMapPoint } from '../types'

type Props = {
  schoolPoints: SchoolMapPoint[]
  selectedSchoolId: string | null
  highlightedSchoolId?: string | null
  onSelectSchool: (id: string | null) => void
}

export default function CanvasSchoolLayer({ schoolPoints, selectedSchoolId, highlightedSchoolId, onSelectSchool }: Props) {
  const map = useMap()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const workerRef = useRef<Worker | null>(null)

  const visibleSchoolPoints = useMemo(() => {
    try {
      const bounds = map.getBounds().pad(0.2)
      return schoolPoints.filter((s) => bounds.contains([s.latitude, s.longitude]))
    } catch {
      return schoolPoints
    }
  }, [schoolPoints, map])

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.left = '0'
    canvas.style.top = '0'
    canvas.style.pointerEvents = 'auto'
    canvasRef.current = canvas

    const overlayPane = map.getPanes().overlayPane
    overlayPane.appendChild(canvas)
    L.DomEvent.disableClickPropagation(canvas)
    L.DomEvent.disableScrollPropagation(canvas)

    let offscreenWorker: Worker | null = null
    const canOffscreen = typeof (canvas as any).transferControlToOffscreen === 'function' && typeof OffscreenCanvas !== 'undefined'

    const resizeCanvas = () => {
      const size = map.getSize()
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(size.x * ratio))
      canvas.height = Math.max(1, Math.floor(size.y * ratio))
      canvas.style.width = `${size.x}px`
      canvas.style.height = `${size.y}px`
      if (!canOffscreen) {
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
        drawMainThread()
      } else if (offscreenWorker) {
        // send fresh init sizes
        const off = (canvas as any).transferControlToOffscreen()
        offscreenWorker.postMessage({ type: 'init', payload: { canvas: off, width: size.x, height: size.y, ratio } }, [off])
      }
    }

    const drawMainThread = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const size = map.getSize()
      ctx.clearRect(0, 0, size.x, size.y)

      const maxStudents = Math.max(...visibleSchoolPoints.map((s) => s.currentStudents ?? 0), 100)

      for (const s of visibleSchoolPoints) {
        const p = map.latLngToContainerPoint([s.latitude, s.longitude])
        const isSelected = s.id === selectedSchoolId
        const isHighlighted = s.id === highlightedSchoolId
        const radius = isSelected ? 8 : isHighlighted ? 6 : Math.max(3, Math.min(6, (s.currentStudents ?? 0) / maxStudents * 6))
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = isSelected ? '#f59e0b' : isHighlighted ? '#60a5fa' : 'rgba(34,197,94,0.9)'
        ctx.fill()
      }
    }

    const drawWorker = () => {
      if (!offscreenWorker) return
      const size = map.getSize()
      const maxStudents = Math.max(...visibleSchoolPoints.map((s) => s.currentStudents ?? 0), 100)
      const points = visibleSchoolPoints.map((s) => {
        const p = map.latLngToContainerPoint([s.latitude, s.longitude])
        const isSelected = s.id === selectedSchoolId
        const isHighlighted = s.id === highlightedSchoolId
        const r = isSelected ? 8 : isHighlighted ? 6 : Math.max(3, Math.min(6, (s.currentStudents ?? 0) / maxStudents * 6))
        return { x: p.x, y: p.y, r, fillStyle: isSelected ? '#f59e0b' : isHighlighted ? '#60a5fa' : 'rgba(34,197,94,0.9)' }
      })
      offscreenWorker.postMessage({ type: 'draw', payload: { width: size.x, height: size.y, points } })
    }

    const draw = () => {
      if (!canOffscreen) return drawMainThread()
      return drawWorker()
    }

    if (canOffscreen) {
      try {
        offscreenWorker = new Worker(new URL('../../workers/processCanvasWorker.ts', import.meta.url), { type: 'module' })
        workerRef.current = offscreenWorker
        // transfer an initial offscreen canvas
        const size = map.getSize()
        const ratio = window.devicePixelRatio || 1
        const off = (canvas as any).transferControlToOffscreen()
        offscreenWorker.postMessage({ type: 'init', payload: { canvas: off, width: size.x, height: size.y, ratio } }, [off])
      } catch (err) {
        offscreenWorker = null
      }
    }

    const onMove = () => resizeCanvas()

    map.on('move resize zoom', onMove)
    resizeCanvas()

    const onClick = (ev: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = ev.clientX - rect.left
      const y = ev.clientY - rect.top
      let nearest: SchoolMapPoint | null = null
      let nearestDist = Infinity
      for (const s of visibleSchoolPoints) {
        const p = map.latLngToContainerPoint([s.latitude, s.longitude])
        const dx = p.x - x
        const dy = p.y - y
        const d2 = dx * dx + dy * dy
        if (d2 < nearestDist) {
          nearestDist = d2
          nearest = s
        }
      }
      if (nearest && nearestDist <= 16 * 16) {
        onSelectSchool(nearest.id)
      }
    }

    canvas.addEventListener('click', onClick)

    return () => {
      canvas.removeEventListener('click', onClick)
      map.off('move resize zoom', onMove)
      try { overlayPane.removeChild(canvas) } catch {}
      try { offscreenWorker && offscreenWorker.terminate() } catch {}
      workerRef.current = null
      canvasRef.current = null
    }
  }, [map, visibleSchoolPoints, selectedSchoolId, highlightedSchoolId, onSelectSchool])

  // redraw on props change
  useEffect(() => {
    // redraw hook: prefer worker-based drawing if present
    const worker = workerRef.current
    const canvas = canvasRef.current
    if (!canvas) return
    const size = map.getSize()
    const maxStudents = Math.max(...visibleSchoolPoints.map((s) => s.currentStudents ?? 0), 100)
    if (worker) {
      const points = visibleSchoolPoints.map((s) => {
        const p = map.latLngToContainerPoint([s.latitude, s.longitude])
        const isSelected = s.id === selectedSchoolId
        const isHighlighted = s.id === highlightedSchoolId
        const r = isSelected ? 8 : isHighlighted ? 6 : Math.max(3, Math.min(6, (s.currentStudents ?? 0) / maxStudents * 6))
        return { x: p.x, y: p.y, r, fillStyle: isSelected ? '#f59e0b' : isHighlighted ? '#60a5fa' : 'rgba(34,197,94,0.9)' }
      })
      worker.postMessage({ type: 'draw', payload: { width: size.x, height: size.y, points } })
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, size.x, size.y)
    for (const s of visibleSchoolPoints) {
      const p = map.latLngToContainerPoint([s.latitude, s.longitude])
      const isSelected = s.id === selectedSchoolId
      const isHighlighted = s.id === highlightedSchoolId
      const radius = isSelected ? 8 : isHighlighted ? 6 : Math.max(3, Math.min(6, (s.currentStudents ?? 0) / maxStudents * 6))
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = isSelected ? '#f59e0b' : isHighlighted ? '#60a5fa' : 'rgba(34,197,94,0.9)'
      ctx.fill()
    }
  }, [visibleSchoolPoints, selectedSchoolId, highlightedSchoolId, map])

  return null
}
