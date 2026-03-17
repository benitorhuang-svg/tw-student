import { useEffect, useRef, useState } from 'react'
import type { AtlasTab } from '../../hooks/useAtlasQueryState'

export type AtlasTabItem = {
  key: AtlasTab
  label: string
  badge?: string
}

type AtlasTabsProps = {
  activeTab: AtlasTab
  items: AtlasTabItem[]
  onSelectTab: (tab: AtlasTab) => void
}

/**
 * Molecule: AtlasTabs
 * 管理導航頁籤與滑動指示器
 */
export function AtlasTabs({ activeTab, items, onSelectTab }: AtlasTabsProps) {
  const containerRef = useRef<HTMLElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0, opacity: 0 })

  useEffect(() => {
    if (!containerRef.current) return
    const activeEl = containerRef.current.querySelector('[aria-selected="true"]') as HTMLElement
    if (activeEl) {
      setIndicatorStyle({
        width: activeEl.offsetWidth,
        left: activeEl.offsetLeft,
        opacity: 1,
      })
    } else {
      setIndicatorStyle(prev => ({ ...prev, opacity: 0 }))
    }
  }, [activeTab, items])

  return (
    <nav className="atlas-tabs" role="tablist" ref={containerRef}>
      <div
        className="atlas-tabs__indicator"
        style={{
          width: indicatorStyle.width,
          transform: `translateX(${indicatorStyle.left}px)`,
          opacity: indicatorStyle.opacity
        }}
        aria-hidden="true"
      />
      {items.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          type="button"
          aria-selected={activeTab === tab.key}
          className={activeTab === tab.key ? 'atlas-tab atlas-tab--active' : 'atlas-tab'}
          onClick={() => onSelectTab(tab.key)}
        >
          {tab.label}
          {tab.badge ? <span className="atlas-tab__badge">{tab.badge}</span> : null}
        </button>
      ))}
    </nav>
  )
}

export default AtlasTabs
