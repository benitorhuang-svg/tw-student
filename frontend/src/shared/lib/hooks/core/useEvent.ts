import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * A hook that returns a stable callback function which always calls the latest
 * version of the passed handler. Useful for avoiding unnecessary re-renders
 * when passing callbacks down to memoized child components.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEvent<T extends (...args: any[]) => any>(handler: T): T {
  const handlerRef = useRef(handler)

  useLayoutEffect(() => {
    handlerRef.current = handler
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useCallback((...args: any[]) => {
    const fn = handlerRef.current
    return fn(...args)
  }, []) as unknown as T
}
