import { useEffect } from 'react'

import { THEME_STORAGE_KEY } from '@/shared/lib/utils/constants'

export function useThemeSync(theme: 'light' | 'dark') {
  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    document.body.setAttribute('data-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111b27' : '#256078')
  }, [theme])
}
