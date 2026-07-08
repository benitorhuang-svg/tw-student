import React from 'react'
import { createPortal } from 'react-dom'

type MiniMapTooltipProps = {
  label: string
  x: number
  y: number
}

/**
 * Atom: MiniMapTooltip
 * A floating label that follows the cursor within the mini-map context.
 * Uses a Portal to ensure it's never clipped by parent containers.
 */
export const MiniMapTooltip: React.FC<MiniMapTooltipProps> = ({ label, x, y }) => {
  return createPortal(
    <div 
      className="atlas-mini-map-tooltip"
      style={{ 
        position: 'fixed',
        left: x + 12,
        top: y - 28,
        pointerEvents: 'none',
        zIndex: 10000
      }}
    >
      {label}
    </div>,
    document.body
  )
}
