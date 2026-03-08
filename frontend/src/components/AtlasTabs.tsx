import type { AtlasTab } from '../hooks/useAtlasQueryState'

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

function AtlasTabs({ activeTab, items, onSelectTab }: AtlasTabsProps) {
  return (
    <nav className="atlas-tabs atlas-tabs--sidebar" role="tablist" aria-label="分析頁籤">
      {items.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          type="button"
          aria-selected={activeTab === tab.key}
          className={activeTab === tab.key ? 'atlas-tab atlas-tab--active atlas-tab--sidebar' : 'atlas-tab atlas-tab--sidebar'}
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