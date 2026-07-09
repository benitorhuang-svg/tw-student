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
