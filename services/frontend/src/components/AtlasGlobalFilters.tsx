import type { TransitionStartFunction } from 'react'
import type { AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../data/educationData'
import { EDUCATION_LEVEL_OPTIONS, MANAGEMENT_TYPE_OPTIONS } from '../lib/constants'
import '../styles/molecules/atlas-filters.css'

type CommonFilterProps = {
  startTransition: TransitionStartFunction
}

// ── PLAYBACK PILL ──
type PlaybackPillProps = {
  onStopPlayback: () => void
}

export function AtlasPlaybackPill({ 
  summaryYears,
  onSetActiveYear,
  onStopPlayback,
  startTransition
}: PlaybackPillProps & { 
  summaryYears: AcademicYear[], 
  onSetActiveYear: (year: AcademicYear) => void,
  startTransition: TransitionStartFunction 
}) {
  const total = summaryYears.length

  return (
    <div className="atlas-slim-player">

      <button
        type="button"
        className="player-mini-btn reset-btn"
        title="回到最新學年"
        onClick={() => {
          onStopPlayback()
          startTransition(() => onSetActiveYear(summaryYears[total - 1]))
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <polyline points="13 17 18 12 13 7" />
          <polyline points="6 17 11 12 6 7" />
        </svg>
      </button>
    </div>
  )
}

import { CollapsibleFilter } from './map/molecules/CollapsibleFilter'

// ── EDUCATION LEVEL FILTER ──
type LevelPillProps = CommonFilterProps & {
  educationLevel: EducationLevelFilter
  onSetEducationLevel: (level: EducationLevelFilter) => void
  hideIcon?: boolean
}
 
export function AtlasLevelFilter({
  educationLevel,
  onSetEducationLevel,
  startTransition,
  hideIcon,
}: LevelPillProps) {
  return (
    <CollapsibleFilter
      label="學制篩選"
      options={EDUCATION_LEVEL_OPTIONS}
      currentValue={educationLevel}
      onSelect={(val) => startTransition(() => onSetEducationLevel(val as EducationLevelFilter))}
      icon={hideIcon ? undefined : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      )}
    />
  )
}

// ── MANAGEMENT TYPE FILTER ──
type TypePillProps = CommonFilterProps & {
  managementType: ManagementTypeFilter
  onSetManagementType: (type: ManagementTypeFilter) => void
  hideIcon?: boolean
}

export function AtlasTypeFilter({
  managementType,
  onSetManagementType,
  startTransition,
  hideIcon,
}: TypePillProps) {
  return (
    <CollapsibleFilter
      label="權屬篩選"
      options={MANAGEMENT_TYPE_OPTIONS}
      currentValue={managementType}
      onSelect={(val) => startTransition(() => onSetManagementType(val as ManagementTypeFilter))}
      icon={hideIcon ? undefined : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7M4 21V7m16 14V7" />
        </svg>
      )}
    />
  )
}


// ── REGION PILL ──
type RegionPillProps = CommonFilterProps & {
  region: RegionGroupFilter
  onSetRegion: (region: RegionGroupFilter) => void
}

export function AtlasRegionPill({
  region,
  onSetRegion,
  startTransition,
  onReset,
}: RegionPillProps & { onReset?: () => void }) {
  const REGION_OPTIONS: { value: RegionGroupFilter; label: string }[] = [
    { value: '全部', label: '全部' },
    { value: '北部', label: '北部' },
    { value: '中部', label: '中部' },
    { value: '南部', label: '南部' },
    { value: '東部', label: '東部' },
    { value: '離島', label: '離島' },
  ]

  return (
    <div className="atlas-region-segmented">
      {REGION_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={region === option.value ? 'region-btn active' : 'region-btn'}
          onClick={() => startTransition(() => onSetRegion(option.value))}
        >
          {option.label}
        </button>
      ))}
      
      {onReset && (
        <>
          <div className="region-separator" />
          <button
            type="button"
            className="region-btn region-reset-btn"
            onClick={onReset}
            title="清除所有設定"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <path d="m3 21 2-2" />
              <path d="M11 13l2 2" />
              <path d="m5 19 14-14c.77-.77 2.03-.77 2.8 0 .77.77.77 2.03 0 2.8L7.8 21.8c-.39.39-.91.6-1.45.6H3v-3.35c0-.54.21-1.06.6-1.45L11 13Z" />
              <line x1="8" y1="16" x2="11" y2="19" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
