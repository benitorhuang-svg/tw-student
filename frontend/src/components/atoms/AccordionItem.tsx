import React from 'react'

type AccordionItemProps = {
  id: string
  title: string
  isExpanded: boolean
  onToggle: (id: string) => void
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

/**
 * Atom: AccordionItem
 * 基礎的收摺單元，提供統一的開闔行為與標題樣式
 */
export const AccordionItem: React.FC<AccordionItemProps> = ({
  id,
  title,
  isExpanded,
  onToggle,
  children,
  style,
  className = ''
}) => {
  return (
    <div className={`accordion-item stagger-item ${isExpanded ? 'accordion-item--expanded' : ''} ${className}`} style={style}>
      <button
        className="accordion-header"
        onClick={() => onToggle(id)}
        aria-expanded={isExpanded}
      >
        <span className="accordion-icon">{isExpanded ? '−' : '+'}</span>
        <span className="accordion-title">{title}</span>
      </button>
      <div className="accordion-content">
        {children}
      </div>
    </div>
  )
}

export default AccordionItem
