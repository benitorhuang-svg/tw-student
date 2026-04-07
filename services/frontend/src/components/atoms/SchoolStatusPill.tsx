import React from 'react'

type SchoolStatusPillProps = {
  status?: '正常' | '停辦' | '整併' | '待確認' | string | null
}

const SchoolStatusPill: React.FC<SchoolStatusPillProps> = ({ status = '正常' }) => {
  const isNormal = !status || status === '正常'
  
  return (
    <span className={isNormal ? 'status-pill status-pill--normal' : 'status-pill'}>
      {status || '正常'}
    </span>
  )
}

export default SchoolStatusPill
