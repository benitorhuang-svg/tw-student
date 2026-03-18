import React, { useState, useRef, useEffect } from 'react'
import { SegmentedPill } from '../atoms/SegmentedPill'

type CollapsibleFilterProps = {
  options: ReadonlyArray<{ value: string; label: string }>
  currentValue: string
  onSelect: (value: string) => void
  icon: React.ReactNode
  label: string
}

/**
 * Molecule: CollapsibleFilter
 * A wrapper that allows hiding/showing a segmented filter pill.
 * Optimized with click-outside closure.
 */
export const CollapsibleFilter = ({
  options,
  currentValue,
  onSelect,
  icon,
  label
}: CollapsibleFilterProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    // Use a small delay for adding the setlistener to prevent immediate closing
    const timeoutId = setTimeout(() => {
      window.addEventListener('click', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={`map-collapsible-filter ${isOpen ? 'is-open' : ''}`} ref={containerRef}>
      <button 
        type="button"
        className="filter-toggle-btn" 
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        aria-expanded={isOpen}
        title={label}
      >
        <span className="filter-toggle-icon">{icon}</span>
        <span className="filter-active-label">
          {options.find(o => o.value === currentValue)?.label}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', opacity: 0.5 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      
      <div className="filter-expansion" onClick={(e) => e.stopPropagation()}>
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
