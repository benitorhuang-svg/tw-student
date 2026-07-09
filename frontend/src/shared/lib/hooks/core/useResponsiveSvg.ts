import { useEffect, useRef, useState } from 'react'

type UseResponsiveSvgOptions = {
  minWidth?: number
  minHeight?: number
}

export function useResponsiveSvg(baseWidth: number, baseHeight: number, options: UseResponsiveSvgOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: baseWidth, height: baseHeight })
  const sizeRef = useRef(size)

  useEffect(() => {
    sizeRef.current = size
  }, [size])

  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof ResizeObserver === 'undefined') return

    const minWidth = options.minWidth ?? 320
    const minHeight = options.minHeight ?? 180
    let frameId: number | null = null
    let pendingWidth = element.clientWidth || baseWidth

    const updateSize = (nextWidth: number) => {
      const roundedWidth = Math.max(Math.round(nextWidth), minWidth)

      if (Math.abs(sizeRef.current.width - roundedWidth) <= 2) {
        return
      }

      const nextHeight = Math.max(Math.round((roundedWidth * baseHeight) / baseWidth), minHeight)
      const nextSize = { width: roundedWidth, height: nextHeight }
      sizeRef.current = nextSize
      setSize(nextSize)
    }

    const scheduleUpdate = (nextWidth: number) => {
      pendingWidth = nextWidth
      if (frameId != null) return

      frameId = window.requestAnimationFrame(() => {
        frameId = null
        updateSize(pendingWidth)
      })
    }

    updateSize(element.clientWidth || baseWidth)

    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (entry) {
        scheduleUpdate(entry.contentRect.width)
      }
    })

    observer.observe(element)
    return () => {
      observer.disconnect()
      if (frameId != null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [baseHeight, baseWidth, options.minHeight, options.minWidth])

  return {
    containerRef,
    width: size.width,
    height: size.height,
  }
}
