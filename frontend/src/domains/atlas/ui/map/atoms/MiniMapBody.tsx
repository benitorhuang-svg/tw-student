import React from 'react'

export type MiniMapBodyProps = {
  children: React.ReactNode
}

/**
 * Atom: MiniMapBody
 * Wrapper for the main content area of the mini-map card.
 */
export const MiniMapBody: React.FC<MiniMapBodyProps> = ({ children }) => (
  <div className="atlas-mini-map-card__body">
    {children}
  </div>
)
