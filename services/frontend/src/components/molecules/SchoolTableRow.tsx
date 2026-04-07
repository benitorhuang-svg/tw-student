import React from 'react'
import { formatDelta, formatStudents, type SchoolInsight } from '../../lib/analytics'

type SchoolTableRowProps = {
  school: SchoolInsight
  isActive: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  maxStudents?: number
  maxDelta?: number
  style?: React.CSSProperties
}

const SchoolTableRow: React.FC<SchoolTableRowProps> = ({
  school,
  isActive,
  onSelect,
  onHover,
  maxStudents = 1,
  maxDelta = 1,
  style
}) => {
  const studentRatio = (school.currentStudents / maxStudents) * 100
  const deltaRatio = (Math.abs(school.delta) / maxDelta) * 100
  
  return (
    <tr
      className={`school-table-v2-row ${isActive ? 'school-table-v2-row--active' : ''}`}
      onClick={() => onSelect(school.id)}
      onMouseEnter={() => onHover(school.id)}
      onMouseLeave={() => onHover(null)}
      style={style}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(school.id)
        }
      }}
      tabIndex={0}
    >
      <td className="school-table__cell--name">
        <div className="school-name-group-v2">
          <strong>{school.name}</strong>
          <span className="school-code-v2">{school.code}</span>
        </div>
      </td>
      <td><span className="education-chip">{school.educationLevel}</span></td>
      <td><span className="management-chip">{school.managementType}</span></td>
      
      {/* ── Students Metric ── */}
      <td>
        <div className="metric-v2">
          <div className="metric-v2__text">
            <span>{formatStudents(school.currentStudents)}</span>
          </div>
          <div className="metric-v2__bar">
            <div 
              className="metric-v2__fill" 
              style={{ width: `${studentRatio}%` }} 
            />
          </div>
        </div>
      </td>
      
      {/* ── Delta Metric ── */}
      <td>
        <div className={`metric-v2 ${school.delta >= 0 ? 'metric-v2--up' : 'metric-v2--down'}`}>
          <div className="metric-v2__text">
            {school.delta > 0 && <span>+</span>}
            <span>{formatDelta(school.delta)}</span>
            {school.delta !== 0 && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px' }}>
                {school.delta > 0 ? (
                  <path d="M18 15l-6-6-6 6" />
                ) : (
                  <path d="M6 9l6 6 6-6" />
                )}
              </svg>
            )}
          </div>
          <div className="metric-v2__bar">
            <div 
              className="metric-v2__fill" 
              style={{ width: `${deltaRatio}%` }} 
            />
          </div>
        </div>
      </td>
    </tr>
  )
}

export default SchoolTableRow
