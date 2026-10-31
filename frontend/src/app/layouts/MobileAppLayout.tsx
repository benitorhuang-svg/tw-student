import { useState, type ReactNode, type TransitionStartFunction } from 'react'
import type { AcademicYear } from '@/shared/api/data/educationData'
import MobileFilterDrawer from '@/shared/ui/components/mobile/MobileFilterDrawer'
import { useAtlasStore } from "@/app/store"
import { FilterBar } from '@/domains/scenario'

// Mobile uses the same single-page dashboard structure, with filters moved into a drawer.

type MobileAppLayoutProps = {
    map: ReactNode

    // Filter
    summaryYears: AcademicYear[]
    isYearPlaybackActive: boolean
    isPending: boolean
    countyQuickPicks: Array<{ id: string; name: string }>

    onSetIsYearPlaybackActive: (value: boolean) => void
    onResetScope: () => void
    onSelectCounty: (countyId: string) => void
    onPrefetchCounty: (countyId: string | null) => void
    startTransition: TransitionStartFunction
}

function MobileAppLayout(props: MobileAppLayoutProps) {
    const {
        map,
        onSelectCounty,
        onPrefetchCounty,
    } = props

    const activeYear = useAtlasStore(state => state.activeYear)
    const theme = useAtlasStore(state => state.theme)
    const setTheme = useAtlasStore(state => state.setTheme)
    const educationLevel = useAtlasStore(state => state.educationLevel)
    const managementType = useAtlasStore(state => state.managementType)
    const region = useAtlasStore(state => state.region)
    const activeCountyId = useAtlasStore(state => state.selectedCountyId)

    const setActiveYear = useAtlasStore(state => state.setActiveYear)
    const setEducationLevel = useAtlasStore(state => state.setEducationLevel)
    const setManagementType = useAtlasStore(state => state.setManagementType)
    const setRegion = useAtlasStore(state => state.setRegion)

    const [isFilterOpen, setIsFilterOpen] = useState(false)

    return (
        <>
            <div className="mobile-layout" data-view="map-centric">
                <div className="mobile-layout__full-map">
                    {map}
                <button
                    type="button"
                    className="mobile-theme-toggle"
                    aria-label="切換亮暗模式"
                    aria-pressed={theme === 'dark'}
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        {theme === 'dark' ? <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
                    </svg>
                </button>
                </div>
            </div>

            <MobileFilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
            >
                <FilterBar
                    years={props.summaryYears}
                    activeYear={activeYear}
                    educationLevel={educationLevel}
                    managementType={managementType}
                    region={region}
                    isYearPlaybackActive={props.isYearPlaybackActive}
                    isPending={props.isPending}
                    countyQuickPicks={props.countyQuickPicks}
                    activeCountyId={activeCountyId}
                    onSetActiveYear={setActiveYear}
                    onSetEducationLevel={setEducationLevel}
                    onSetManagementType={setManagementType}
                    onSetRegion={setRegion}
                    onSetIsYearPlaybackActive={props.onSetIsYearPlaybackActive}
                    onResetScope={props.onResetScope}
                    onSelectCounty={onSelectCounty}
                    onPrefetchCounty={onPrefetchCounty}
                    startTransition={props.startTransition}
                />
            </MobileFilterDrawer>
        </>
    )
}

export default MobileAppLayout
