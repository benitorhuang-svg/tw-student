import { useEffect, useRef, useState } from 'react'

type UseResponsiveSvgOptions = {
  minWidth?: number
  minHeight?: number
}

export function useResponsiveSvg(baseWidth: number, baseHeight: number, options: UseResponsiveSvgOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: baseWidth, height: baseHeight })

  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof ResizeObserver === 'undefined') return

    const minWidth = options.minWidth ?? 320
    const minHeight = options.minHeight ?? 180
    const updateSize = (nextWidth: number) => {
      const width = Math.max(Math.round(nextWidth), minWidth)
      const height = Math.max(Math.round((width * baseHeight) / baseWidth), minHeight)
      setSize({ width, height })
    }

    updateSize(element.clientWidth || baseWidth)

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateSize(entry.contentRect.width)
      }
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [baseHeight, baseWidth, options.minHeight, options.minWidth])

  return {
    containerRef,
    width: size.width,
    height: size.height,
  }
}
