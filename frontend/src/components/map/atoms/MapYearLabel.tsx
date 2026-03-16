import React from 'react'
import { toGregorianYear } from '../../../lib/analytics.formatters'
import type { AcademicYear } from '../../../data/educationData'

type MapYearLabelProps = {
  activeYear: AcademicYear
  style?: React.CSSProperties
}

/**
 * Atom: MapYearLabel
 * Displays the academic year in Gregorian format (e.g. 2020-2021).
 */
export const MapYearLabel = ({ activeYear, style }: MapYearLabelProps) => {
  const yearNum = Number(activeYear)
  return (
    <div className="map-year-label" style={style}>
      {toGregorianYear(yearNum)}-{toGregorianYear(yearNum) + 1}
    </div>
  )
}
