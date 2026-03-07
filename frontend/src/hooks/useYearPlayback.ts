import { useEffect, useState, type TransitionStartFunction } from 'react'
import type { AcademicYear, EducationSummaryDataset } from './types'

export function useYearPlayback(
  summaryDataset: EducationSummaryDataset | null,
  setActiveYear: React.Dispatch<React.SetStateAction<AcademicYear>>,
  startTransition: TransitionStartFunction,
) {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (!summaryDataset || !isActive || summaryDataset.years.length <= 1) return

    const timer = window.setInterval(() => {
      startTransition(() => {
        setActiveYear((currentYear) => {
          const currentIndex = summaryDataset.years.indexOf(currentYear)
          const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % summaryDataset.years.length : summaryDataset.years.length - 1
          return summaryDataset.years[nextIndex] ?? currentYear
        })
      })
    }, 1800)

    return () => window.clearInterval(timer)
  }, [isActive, setActiveYear, startTransition, summaryDataset])

  return [isActive, setIsActive] as const
}
