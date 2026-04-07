import { useEffect, useRef, useState } from 'react'

type AnimatedNumberProps = {
  value: number
  duration?: number
  formatter?: (v: number) => string
}

function AnimatedNumber({ value, duration = 600, formatter }: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(value)
  const prevRef = useRef(value)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    prevRef.current = value

    if (from === to) return

    const startTime = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(from + (to - from) * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return <>{formatter ? formatter(displayed) : displayed.toLocaleString('zh-TW')}</>
}

export default AnimatedNumber
