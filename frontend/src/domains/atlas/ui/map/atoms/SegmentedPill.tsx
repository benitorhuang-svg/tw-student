import React from 'react'

type SegmentedOption = {
  value: string
  label: string
}

type SegmentedPillProps = {
  options: ReadonlyArray<SegmentedOption>
  currentValue: string
  onSelect: (value: string) => void
  icon: React.ReactNode
  className?: string
}

/**
 * Atom/Molecule: SegmentedPill
 * A reusable segmented control with an icon and multiple button options.
 */
export const SegmentedPill = ({
  options,
  currentValue,
  onSelect,
  icon,
  className = ""
}: SegmentedPillProps) => {
  return (
    <div className={`map-context-segmented ${className}`}>
      <div className="segmented-icon">
        {icon}
      </div>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={currentValue === option.value ? 'segmented-btn active' : 'segmented-btn'}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
