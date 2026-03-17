import React from 'react'
import { formatDelta, formatStudents, type SchoolInsight } from '../../lib/analytics'
import SchoolStatusPill from '../atoms/SchoolStatusPill'

type SchoolTableRowProps = {
  school: SchoolInsight
  isActive: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  maxStudents?: number
  maxDelta?: number
}

const SchoolTableRow: React.FC<SchoolTableRowProps> = ({
  school,
  isActive,
  onSelect,
  onHover,
  maxStudents = 1,
  maxDelta = 1
}) => {
  const studentRatio = (school.currentStudents / maxStudents) * 100
  const deltaRatio = (Math.abs(school.delta) / maxDelta) * 100

  return (
    <tr
      className={isActive ? 'school-table__row school-table__row--active' : 'school-table__row'}
      onClick={() => onSelect(school.id)}
      onMouseEnter={() => onHover(school.id)}
      onMouseLeave={() => onHover(null)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(school.id)
        }
      }}
      tabIndex={0}
    >
      <td className="school-table__cell--name">
        <div className="school-name-group">
          <strong>{school.name}</strong>
          <small>{school.code}</small>
        </div>
      </td>
      <td><span className="text-dim">{school.townshipName}</span></td>
      <td><span className="education-chip">{school.educationLevel}</span></td>
      <td><span className="management-chip">{school.managementType}</span></td>
      <td className="school-table__cell--metrics">
        <div className="metric-visual-box">
          <div className="metric-text-row">
            <span className="metric-value">{formatStudents(school.currentStudents)}</span>
          </div>
          <div className="metric-bar-track">
            <div 
              className="metric-bar-fill" 
              style={{ width: `${studentRatio}%` }} 
            />
          </div>
        </div>
      </td>
      <td className="school-table__cell--metrics">
        <div className="metric-visual-box">
          <div className={`metric-text-row ${school.delta >= 0 ? 'text-up' : 'text-down'}`}>
            <span className="metric-value">{formatDelta(school.delta)}</span>
          </div>
          <div className="metric-bar-track metric-bar-track--delta">
            <div 
              className={`metric-bar-fill ${school.delta >= 0 ? 'bg-up' : 'bg-down'}`} 
              style={{ width: `${deltaRatio}%` }} 
            />
          </div>
        </div>
      </td>
      <td className="school-table__cell--status">
        <SchoolStatusPill status={school.status} />
      </td>
    </tr>
  )
}

export default SchoolTableRow
