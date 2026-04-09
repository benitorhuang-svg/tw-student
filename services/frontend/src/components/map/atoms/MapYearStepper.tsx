import React from 'react'
import type { AcademicYear } from '../../../data/educationData'

type MapYearStepperProps = {
  activeYear: AcademicYear
  summaryYears: AcademicYear[]
  isYearPlaybackActive: boolean
  onSetActiveYear: (year: AcademicYear) => void
  onStopPlayback: () => void
  onTogglePlayback: () => void
  startTransition: React.TransitionStartFunction
}

export const MapYearStepper = ({
  activeYear,
  summaryYears,
  isYearPlaybackActive,
  onSetActiveYear,
  onStopPlayback,
  onTogglePlayback,
  startTransition,
}: MapYearStepperProps) => {
  const activeIdx = summaryYears.indexOf(activeYear)
  const total = summaryYears.length

  const handleStep = (direction: number) => {
    const nextIdx = activeIdx + direction
    if (nextIdx >= 0 && nextIdx < total) {
      onStopPlayback()
      startTransition(() => onSetActiveYear(summaryYears[nextIdx]))
    }
  }

  return (
    <div className="map-year-stepper">
      <div className="map-year-stepper__wrapper">
        <div className="map-year-stepper__controls">
          <button
            type="button"
            className="map-year-stepper__btn"
            disabled={activeIdx <= 0}
            onClick={() => handleStep(-1)}
            aria-label="上一個學年度"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="map-year-stepper__label">
            {activeYear}學年度
          </div>
          <button
            type="button"
            className="map-year-stepper__btn"
            disabled={activeIdx >= total - 1}
            onClick={() => handleStep(1)}
            aria-label="下一個學年度"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        
        <div className="map-year-stepper__divider" />

        <button
          type="button"
          className={`map-year-stepper__play-btn ${isYearPlaybackActive ? 'is-playing' : ''}`}
          onClick={onTogglePlayback}
          aria-label={isYearPlaybackActive ? '停止播放' : '開始播放'}
        >
          {isYearPlaybackActive ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

export default MapYearStepper
