import React from 'react'

type WorkbenchTabProps = {
  label: string
  isActive?: boolean
  isBack?: boolean
  onClick?: () => void
}

/**
 * Atom: WorkbenchTab
 * 用於學校概況面板的切換按鈕
 */
export const WorkbenchTab: React.FC<WorkbenchTabProps> = ({ 
  label, 
  isActive, 
  isBack, 
  onClick 
}) => {
  const className = [
    'workbench-tab',
    isActive ? 'workbench-tab--active' : '',
    isBack ? 'workbench-tab--back' : ''
  ].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      role="tab"
      className={className}
      onClick={onClick}
      aria-selected={isActive}
    >
      {isBack && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 14, height: 14 }}
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      )}
      {label}
    </button>
  )
}

export default WorkbenchTab
