import type { TransitionStartFunction } from 'react'
import type {
    AcademicYear,
    EducationLevelFilter,
    ManagementTypeFilter,
    RegionGroupFilter,
} from '../../data/educationData'
import FilterBar from '../FilterBar'

type MobileFilterDrawerProps = {
    isOpen: boolean
    onClose: () => void
    years: AcademicYear[]
    activeYear: AcademicYear
    educationLevel: EducationLevelFilter
    managementType: ManagementTypeFilter
    region: RegionGroupFilter
    searchText: string
    isYearPlaybackActive: boolean
    isPending: boolean
    countyQuickPicks: Array<{ id: string; name: string }>
    activeCountyId: string | null
    onSetActiveYear: (year: AcademicYear) => void
    onSetEducationLevel: (value: EducationLevelFilter) => void
    onSetManagementType: (value: ManagementTypeFilter) => void
    onSetRegion: (value: RegionGroupFilter) => void
    onSetSearchText: (value: string) => void
    onSetIsYearPlaybackActive: (value: boolean) => void
    onResetScope: () => void
    onSelectCounty: (countyId: string) => void
    onPrefetchCounty: (countyId: string | null) => void
    startTransition: TransitionStartFunction
}

function MobileFilterDrawer({
    isOpen,
    onClose,
    years,
    activeYear,
    educationLevel,
    managementType,
    region,
    searchText,
    isYearPlaybackActive,
    isPending,
    countyQuickPicks,
    activeCountyId,
    onSetActiveYear,
    onSetEducationLevel,
    onSetManagementType,
    onSetRegion,
    onSetSearchText,
    onSetIsYearPlaybackActive,
    onResetScope,
    onSelectCounty,
    onPrefetchCounty,
    startTransition,
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
                    <FilterBar
                        years={years}
                        activeYear={activeYear}
                        educationLevel={educationLevel}
                        managementType={managementType}
                        region={region}
                        searchText={searchText}
                        isYearPlaybackActive={isYearPlaybackActive}
                        isPending={isPending}
                        countyQuickPicks={countyQuickPicks}
                        activeCountyId={activeCountyId}
                        onSetActiveYear={onSetActiveYear}
                        onSetEducationLevel={onSetEducationLevel}
                        onSetManagementType={onSetManagementType}
                        onSetRegion={onSetRegion}
                        onSetSearchText={onSetSearchText}
                        onSetIsYearPlaybackActive={onSetIsYearPlaybackActive}
                        onResetScope={onResetScope}
                        onSelectCounty={onSelectCounty}
                        onPrefetchCounty={onPrefetchCounty}
                        startTransition={startTransition}
                    />
                </div>
            </div>
        </>
    )
}

export default MobileFilterDrawer
