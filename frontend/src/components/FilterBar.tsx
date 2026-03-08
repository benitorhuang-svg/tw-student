import { formatAcademicYear } from '../lib/analytics'
import type { AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../hooks/types'
import {
  EDUCATION_LEVELS,
  MANAGEMENT_TYPES,
  REGION_GROUPS,
} from '../data/educationData'
import type { TransitionStartFunction } from 'react'

type CountyQuickPick = {
  id: string
  name: string
}

type FilterBarProps = {
  years: readonly AcademicYear[]
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  searchText: string
  isYearPlaybackActive: boolean
  isPending: boolean
  countyQuickPicks: CountyQuickPick[]
  activeCountyId: string | null
  onSetActiveYear: (year: AcademicYear) => void
  onSetEducationLevel: (level: EducationLevelFilter) => void
  onSetManagementType: (type: ManagementTypeFilter) => void
  onSetRegion: (region: RegionGroupFilter) => void
  onSetSearchText: (value: string) => void
  onSetIsYearPlaybackActive: (active: boolean) => void
  onResetScope: () => void
  onSelectCounty: (countyId: string) => void
  onPrefetchCounty: (countyId: string | null) => void
  startTransition: TransitionStartFunction
}

function FilterBar({
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
}: FilterBarProps) {
  return (
    <section className="atlas-filterbar panel">
      <div className="atlas-filterbar__years">
        <label className="filter-select filter-select--year">
          <span>學年度</span>
          <select
            value={activeYear}
            data-testid="academic-year-select"
            onChange={(event) => {
              onSetIsYearPlaybackActive(false)
              startTransition(() => onSetActiveYear(Number(event.target.value) as AcademicYear))
            }}
          >
            {years.map((year) => (
              <option key={year} value={year}>{formatAcademicYear(year)}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={isYearPlaybackActive ? 'ghost-button ghost-button--active' : 'ghost-button'}
          onClick={() => onSetIsYearPlaybackActive(!isYearPlaybackActive)}
        >
          {isYearPlaybackActive ? '停止年度播放' : '播放歷年變動'}
        </button>
      </div>

      <div className="atlas-filterbar__controls">
        <label className="filter-select">
          <span>教育階段</span>
          <select value={educationLevel} onChange={(event) => startTransition(() => onSetEducationLevel(event.target.value as EducationLevelFilter))}>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>

        <label className="filter-select">
          <span>公私立</span>
          <select value={managementType} onChange={(event) => startTransition(() => onSetManagementType(event.target.value as ManagementTypeFilter))}>
            {MANAGEMENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="filter-select">
          <span>區域</span>
          <select value={region} onChange={(event) => startTransition(() => onSetRegion(event.target.value as RegionGroupFilter))}>
            {REGION_GROUPS.map((regionOption) => (
              <option key={regionOption} value={regionOption}>{regionOption}</option>
            ))}
          </select>
        </label>

        <label className="filter-select filter-select--search">
          <span>搜尋縣市 / 鄉鎮 / 學校</span>
          <input value={searchText} onChange={(event) => onSetSearchText(event.target.value)} placeholder="例如：宜蘭、國中、私立" />
        </label>
      </div>

      <div className="atlas-filterbar__meta">
        <button type="button" className="ghost-button" onClick={onResetScope} data-testid="reset-scope-button">
          回到全台
        </button>
        <span>{isPending ? '畫面更新中…' : `${formatAcademicYear(activeYear)} 已套用`}</span>
      </div>

      <div className="atlas-county-picks">
        <span className="filter-group__label">縣市快速切換</span>
        <div className="chip-row">
          {countyQuickPicks.map((county) => (
            <button
              key={county.id}
              type="button"
              className={county.id === activeCountyId ? 'chip chip--active' : 'chip'}
              onClick={() => onSelectCounty(county.id)}
              onMouseEnter={() => onPrefetchCounty(county.id)}
            >
              {county.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FilterBar
