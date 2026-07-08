import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT = 860

const subscribe = (cb: () => void) => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    mql.addEventListener('change', cb)
    return () => mql.removeEventListener('change', cb)
}

const getSnapshot = () =>
    window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches

export function useIsMobile() {
    return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
