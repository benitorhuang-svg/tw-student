import { useEffect, useRef, useState } from 'react'

/**
 * Shared chart enter-animation hook using IntersectionObserver.
 * Returns a ref to attach to the chart container and a boolean `isVisible`
 * that flips to true once the element scrolls into view.
 */
export function useChartAnimation(options?: { threshold?: number; rootMargin?: string }) {
  const ref = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: options?.threshold ?? 0.15, rootMargin: options?.rootMargin ?? '0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [options?.threshold, options?.rootMargin])

  return { ref, isVisible }
}
