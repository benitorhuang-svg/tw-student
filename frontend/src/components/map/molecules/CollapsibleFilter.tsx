import React, { useState } from 'react'
import { SegmentedPill } from '../atoms/SegmentedPill'

type CollapsibleFilterProps = {
  options: ReadonlyArray<{ value: string; label: string }>
  currentValue: string
  onSelect: (value: any) => void
  icon: React.ReactNode
  label: string
}

/**
 * Molecule: CollapsibleFilter
 * A wrapper that allows hiding/showing a segmented filter pill.
 */
export const CollapsibleFilter = ({
  options,
  currentValue,
  onSelect,
  icon,
  label
}: CollapsibleFilterProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`map-collapsible-filter ${isOpen ? 'is-open' : ''}`}>
      <button 
        type="button"
        className="filter-toggle-btn" 
        onClick={() => setIsOpen(!isOpen)}
        title={label}
      >
        <span className="filter-toggle-icon">{icon}</span>
        <span className="filter-active-label">
          {options.find(o => o.value === currentValue)?.label}
        </span>
      </button>
      
      <div className="filter-expansion">
        <SegmentedPill
          options={options}
          currentValue={currentValue}
          onSelect={(val) => {
            onSelect(val)
            setIsOpen(false) // Auto-collapse on selection
          }}
          icon={icon}
        />
      </div>
    </div>
  )
}
