import { useRef, useState, useEffect } from 'react'

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
 *
 * Avoids ResizeObserver entirely to prevent feedback loops with responsive SVG charts.
 * Uses a generous fixed maxHeight for the CSS open/close transition, then removes
 * the maxHeight constraint once settled so inner content can size freely.
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
  // After opening transition completes, switch to 'settled' to remove maxHeight constraint
  const [settled, setSettled] = useState(isExpanded)

  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        requestAnimationFrame(() => setSettled(true))
      }, 400)
      return () => clearTimeout(timer)
    } else {
      requestAnimationFrame(() => setSettled(false))
    }
  }, [isExpanded])

  const contentStyle: React.CSSProperties = !isExpanded
    ? {
        maxHeight: '0px',
        overflow: 'hidden',
        opacity: 0,
        transform: 'scaleY(0.98)',
        transformOrigin: 'top',
        transition: 'max-height 360ms cubic-bezier(.2,.9,.2,1), opacity 240ms ease, transform 360ms cubic-bezier(.2,.9,.2,1)',
      }
    : settled
      ? {
          /* Settled: no maxHeight cap, overflow visible for tooltips/dropdowns */
          maxHeight: 'none',
          overflow: 'visible',
          opacity: 1,
        }
      : {
          /* Animating: generous fixed maxHeight drives the CSS transition */
          maxHeight: '5000px',
          overflow: 'hidden',
          opacity: 1,
          transform: 'scaleY(1)',
          transformOrigin: 'top',
          transition: 'max-height 360ms cubic-bezier(.2,.9,.2,1), opacity 240ms ease, transform 360ms cubic-bezier(.2,.9,.2,1)',
        }

  return (
    <div className={`accordion-item stagger-item ${isExpanded ? 'accordion-item--expanded' : ''} ${className}`} style={style}>
      <button
        className="accordion-header"
        onClick={() => onToggle(id)}
        aria-expanded={isExpanded}
      >
        <div className={`accordion-icon-box ${isExpanded ? 'accordion-icon-box--expanded' : ''}`}>
          {isExpanded ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          )}
        </div>
        <span className="accordion-title">{title}</span>
      </button>
      <div
        className="accordion-content"
        ref={contentRef}
        aria-hidden={!isExpanded}
        style={contentStyle}
      >
        {children}
      </div>
    </div>
  )
}

export default AccordionItem
