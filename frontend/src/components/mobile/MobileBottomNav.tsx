import type { ReactNode } from 'react'
import type { AtlasTab } from '../../hooks/useAtlasQueryState'
import type { AtlasTabItem } from '../AtlasTabs'

type MobileBottomNavProps = {
    activeTab: AtlasTab
    items: AtlasTabItem[]
    onSelectTab: (tab: AtlasTab) => void
}

const TAB_ICONS: Record<AtlasTab, ReactNode> = {
    overview: (
        <svg className="mobile-bottom-nav__icon" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    ),
    regional: (
        <svg className="mobile-bottom-nav__icon" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    county: (
        <svg className="mobile-bottom-nav__icon" viewBox="0 0 24 24">
            <path d="M4 5h16v4H4z" />
            <path d="M4 11h10v8H4z" />
            <path d="M16 11h4v8h-4z" />
        </svg>
    ),
    schools: (
        <svg className="mobile-bottom-nav__icon" viewBox="0 0 24 24">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
    ),
    'school-focus': (
        <svg className="mobile-bottom-nav__icon" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" />
            <path d="M5 21c1.5-4 4.5-6 7-6s5.5 2 7 6" />
        </svg>
    ),
}

function MobileBottomNav({ activeTab, items, onSelectTab }: MobileBottomNavProps) {
    return (
        <nav className="mobile-bottom-nav" role="tablist" aria-label="主導覽">
            {items.map((item) => (
                <button
                    key={item.key}
                    role="tab"
                    type="button"
                    aria-selected={activeTab === item.key}
                    className={`mobile-bottom-nav__item${activeTab === item.key ? ' mobile-bottom-nav__item--active' : ''}`}
                    onClick={() => onSelectTab(item.key)}
                >
                    {TAB_ICONS[item.key]}
                    <span>{item.label}</span>
                    {item.badge ? <span className="mobile-bottom-nav__badge">{item.badge}</span> : null}
                </button>
            ))}
        </nav>
    )
}

export default MobileBottomNav
