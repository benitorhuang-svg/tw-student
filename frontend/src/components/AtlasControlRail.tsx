import type { ReactNode, TransitionStartFunction } from 'react'

import type { AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../hooks/types'
import type { AtlasTab } from '../hooks/useAtlasQueryState'
import type { AtlasTabItem } from './molecules/AtlasTabs'
import AtlasTabs from './molecules/AtlasTabs'
import FilterBar from './FilterBar'

type CountyQuickPick = {
  id: string
  name: string
}

type AtlasControlRailProps = {
  activeTab: AtlasTab
  tabItems: AtlasTabItem[]
  onSetActiveTab: (tab: AtlasTab) => void
  scopePath: string[]
  scopeHeadline: string
  scopeDescription: string
  summaryYears: AcademicYear[]
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  isYearPlaybackActive: boolean
  isPending: boolean
  countyQuickPicks: CountyQuickPick[]
  activeCountyId: string | null
  onSetActiveYear: (year: AcademicYear) => void
  onSetEducationLevel: (value: EducationLevelFilter) => void
  onSetManagementType: (value: ManagementTypeFilter) => void
  onSetRegion: (value: RegionGroupFilter) => void
  onSetIsYearPlaybackActive: (value: boolean) => void
  onResetScope: () => void
  onSelectCounty: (countyId: string) => void
  onPrefetchCounty: (countyId: string | null) => void
  startTransition: TransitionStartFunction
  children: ReactNode
}

function AtlasControlRail({
  activeTab,
  tabItems,
  onSetActiveTab,
  scopePath,
  scopeHeadline,
  scopeDescription,
  summaryYears,
  activeYear,
  educationLevel,
  managementType,
  region,
  isYearPlaybackActive,
  isPending,
  countyQuickPicks,
  activeCountyId,
  onSetActiveYear,
  onSetEducationLevel,
  onSetManagementType,
  onSetRegion,
  onSetIsYearPlaybackActive,
  onResetScope,
  onSelectCounty,
  onPrefetchCounty,
  startTransition,
  children,
}: AtlasControlRailProps) {
  const activeTabLabel = tabItems.find((item) => item.key === activeTab)?.label ?? '概況總覽'

  return (
    <aside className="atlas-control-rail">
      <section className="control-hero">
        <p className="eyebrow">Taiwan Education Atlas</p>
        <h1>全台就讀人數地圖分析系統</h1>
        <p>
          左側先縮小地理範圍與查詢條件，右側再閱讀卡片、圖表與學校表格，避免地圖和分析內容互相爭奪主視覺。
        </p>
      </section>

      <section className="sidebar-block sidebar-block--nav">
        <AtlasTabs activeTab={activeTab} items={tabItems} onSelectTab={onSetActiveTab} />

        <div className="control-scope">
          <div className="scope-breadcrumbs">
            {scopePath.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
          <div className="sidebar-block__head">
            <div>
              <p className="eyebrow">目前工作範圍</p>
              <h2>{scopeHeadline}</h2>
            </div>
            <span className="control-scope__badge">{activeTabLabel}</span>
          </div>
          <p className="sidebar-block__description">{scopeDescription}</p>
        </div>
      </section>

      <section className="sidebar-block sidebar-block--filters">
        <FilterBar
          years={summaryYears}
          activeYear={activeYear}
          educationLevel={educationLevel}
          managementType={managementType}
          region={region}
          isYearPlaybackActive={isYearPlaybackActive}
          isPending={isPending}
          countyQuickPicks={countyQuickPicks}
          activeCountyId={activeCountyId}
          onSetActiveYear={onSetActiveYear}
          onSetEducationLevel={onSetEducationLevel}
          onSetManagementType={onSetManagementType}
          onSetRegion={onSetRegion}
          onSetIsYearPlaybackActive={onSetIsYearPlaybackActive}
          onResetScope={onResetScope}
          onSelectCounty={onSelectCounty}
          onPrefetchCounty={onPrefetchCounty}
          startTransition={startTransition}
        />
      </section>

      <section className="control-map-stage">
        <div className="control-map-stage__head">
          <div>
            <p className="eyebrow">地理篩選器</p>
            <h2>台灣行政區地圖</h2>
          </div>
          <p>先點縣市，再點鄉鎮；若切到學校工作台，地圖會改用校點輔助縮小觀察範圍。</p>
        </div>
        <div className="control-map-stage__body">{children}</div>
      </section>
    </aside>
  )
}

export default AtlasControlRail