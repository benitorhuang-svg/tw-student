import { useCallback, useEffect, useState } from 'react'

export function useFeedbackMessage(timeout = 2400) {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), timeout)
    return () => window.clearTimeout(timer)
  }, [message, timeout])

  const show = useCallback((text: string) => setMessage(text), [])
  const clear = useCallback(() => setMessage(null), [])

  return { message, show, clear } as const
}
