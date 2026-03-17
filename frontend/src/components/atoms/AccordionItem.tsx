import React, { useRef, useEffect, useState } from 'react'

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
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [maxHeight, setMaxHeight] = useState<string>('0px')

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    if (isExpanded) {
      const measured = el.scrollHeight
      setMaxHeight(`${measured}px`)
    } else {
      setMaxHeight('0px')
    }
  }, [isExpanded, children])

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
      <div
        className="accordion-content"
        ref={contentRef}
        aria-hidden={!isExpanded}
        style={{
          maxHeight,
          overflow: 'hidden',
          transition: 'max-height 360ms cubic-bezier(.2,.9,.2,1), opacity 240ms ease, transform 360ms cubic-bezier(.2,.9,.2,1)',
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? 'scaleY(1)' : 'scaleY(0.98)',
          transformOrigin: 'top'
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default AccordionItem
