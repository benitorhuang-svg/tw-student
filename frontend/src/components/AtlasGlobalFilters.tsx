import type { TransitionStartFunction } from 'react'
import type { AcademicYear, EducationLevelFilter, ManagementTypeFilter, RegionGroupFilter } from '../data/educationData'
import { EDUCATION_LEVEL_OPTIONS, MANAGEMENT_TYPE_OPTIONS } from '../lib/constants'
import { formatAcademicYear } from '../lib/analytics'
import '../styles/molecules/atlas-filters.css'

type CommonFilterProps = {
  startTransition: TransitionStartFunction
}

// ── PLAYBACK PILL ──
type PlaybackPillProps = {
  isYearPlaybackActive: boolean
  onTogglePlayback: () => void
}

export function AtlasPlaybackPill({ 
  isYearPlaybackActive, 
  onTogglePlayback,
  activeYear,
  summaryYears,
  onSetActiveYear,
  onStopPlayback,
  startTransition
}: PlaybackPillProps & { 
  activeYear: AcademicYear, 
  summaryYears: AcademicYear[], 
  onSetActiveYear: (year: AcademicYear) => void,
  onStopPlayback: () => void,
  startTransition: TransitionStartFunction 
}) {
  const activeIdx = summaryYears.indexOf(activeYear)
  const total = summaryYears.length

  return (
    <div className="atlas-slim-player">
      <div className="player-mini-info">
        <span className="player-mini-year">{formatAcademicYear(activeYear)}</span>
      </div>

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

      <button
        type="button"
        className={isYearPlaybackActive ? 'player-mini-btn active' : 'player-mini-btn'}
        onClick={onTogglePlayback}
      >
        {isYearPlaybackActive ? '■' : '▶'}
      </button>

      <div className="player-mini-steppers">
        <button
          className="mini-step-btn"
          disabled={activeIdx <= 0}
          onClick={() => {
            if (activeIdx > 0) {
              onStopPlayback()
              startTransition(() => onSetActiveYear(summaryYears[activeIdx - 1]))
            }
          }}
        >
          ‹
        </button>
        <button
          className="mini-step-btn"
          disabled={activeIdx >= total - 1}
          onClick={() => {
            if (activeIdx >= 0 && activeIdx < total - 1) {
              onStopPlayback()
              startTransition(() => onSetActiveYear(summaryYears[activeIdx + 1]))
            }
          }}
        >
          ›
        </button>
      </div>
    </div>
  )
}


// ── EDUCATION LEVEL PILL ──
type LevelPillProps = CommonFilterProps & {
  educationLevel: EducationLevelFilter
  onSetEducationLevel: (level: EducationLevelFilter) => void
}

export function AtlasLevelPill({
  educationLevel,
  onSetEducationLevel,
  startTransition,
}: LevelPillProps) {
  return (
    <div className="atlas-region-segmented">
      {EDUCATION_LEVEL_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={educationLevel === option.value ? 'region-btn active' : 'region-btn'}
          onClick={() => startTransition(() => onSetEducationLevel(option.value as EducationLevelFilter))}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// ── MANAGEMENT TYPE PILL ──
type TypePillProps = CommonFilterProps & {
  managementType: ManagementTypeFilter
  onSetManagementType: (type: ManagementTypeFilter) => void
}

export function AtlasTypePill({
  managementType,
  onSetManagementType,
  startTransition,
}: TypePillProps) {
  return (
    <div className="atlas-region-segmented">
      {MANAGEMENT_TYPE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={managementType === option.value ? 'region-btn active' : 'region-btn'}
          onClick={() => startTransition(() => onSetManagementType(option.value as ManagementTypeFilter))}
        >
          {option.label}
        </button>
      ))}
    </div>
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
