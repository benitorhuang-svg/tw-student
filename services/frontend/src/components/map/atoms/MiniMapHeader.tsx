import React from 'react'
import MapBreadcrumb from './MapBreadcrumb'

export type MiniMapHeaderProps = {
  scopePath: string[]
  onNavigate: (depth: number) => void
}

/**
 * Atom: MiniMapHeader
 * Renders the breadcrumb navigation within the mini-map card header.
 */
export const MiniMapHeader: React.FC<MiniMapHeaderProps> = ({ scopePath, onNavigate }) => (
  <div className="atlas-mini-map-card__header">
    <MapBreadcrumb scopePath={scopePath} onNavigate={onNavigate} />
  </div>
)
