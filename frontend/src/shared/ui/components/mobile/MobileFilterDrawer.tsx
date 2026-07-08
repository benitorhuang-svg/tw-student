import type { ReactNode } from 'react'

type MobileFilterDrawerProps = {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
}

function MobileFilterDrawer({
    isOpen,
    onClose,
    children,
}: MobileFilterDrawerProps) {
    if (!isOpen) return null

    return (
        <>
            <div className="mobile-filter-drawer-overlay" onClick={onClose} />
            <div className="mobile-filter-drawer">
                <div className="mobile-filter-drawer__header">
                    <h3>篩選條件</h3>
                    <button type="button" className="mobile-filter-drawer__close" onClick={onClose} aria-label="關閉">
                        ✕
                    </button>
                </div>
                <div className="mobile-filter-drawer__body">
                    {children}
                </div>
            </div>
        </>
    )
}

export default MobileFilterDrawer
