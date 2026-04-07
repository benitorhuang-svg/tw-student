import React from 'react'

type FilterShelfProps = {
  id: string
  icon: React.ReactNode
  children: React.ReactNode
  direction?: 'horizontal' | 'vertical'
  isModified?: boolean
  isOpen: boolean
  onToggle: (id: string) => void
}

export const FilterShelf: React.FC<FilterShelfProps> = ({
  id,
  icon,
  children,
  direction = 'horizontal',
  isModified = false,
  isOpen,
  onToggle
}) => {
  return (
    <div className={`filter-shelf filter-shelf--${direction} ${isOpen ? 'filter-shelf--open' : ''}`}>
      <button
        className={`filter-shelf__toggle ${isOpen ? 'filter-shelf__toggle--active' : ''} ${isModified && !isOpen ? 'filter-shelf__toggle--modified' : ''}`}
        onClick={() => onToggle(id)}
        title="切換篩選面板"
      >
        {icon}
        {isModified && !isOpen && <span className="filter-shelf__dot" />}
      </button>
      <div className="filter-shelf__content">
        {children}
      </div>
    </div>
  )
}

export default FilterShelf
