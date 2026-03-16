import React from 'react'
import { formatDelta, formatStudents, type SchoolInsight } from '../../lib/analytics'
import SchoolStatusPill from '../atoms/SchoolStatusPill'

type SchoolTableRowProps = {
  school: SchoolInsight
  isActive: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

const SchoolTableRow: React.FC<SchoolTableRowProps> = ({
  school,
  isActive,
  onSelect,
  onHover,
}) => {
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
      <td>
        <strong>{school.name}</strong>
      </td>
      <td>{school.townshipName}</td>
      <td>{school.educationLevel}</td>
      <td>{school.managementType}</td>
      <td>{formatStudents(school.currentStudents)} 人</td>
      <td className={school.delta >= 0 ? 'school-table__delta school-table__delta--up' : 'school-table__delta school-table__delta--down'}>
        {formatDelta(school.delta)}
      </td>
      <td>
        <SchoolStatusPill status={school.status} />
      </td>
    </tr>
  )
}

export default SchoolTableRow
