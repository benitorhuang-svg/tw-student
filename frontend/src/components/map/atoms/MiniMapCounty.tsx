import React from 'react'

export type MiniMapCountyProps = {
  id: string
  name: string
  pathData: string
  isIsland: boolean
  center?: { x: number; y: number }
  isActive: boolean
  onSelect: (id: string) => void
  onHover: (name: string | null) => void
}

/**
 * Atom: MiniMapCounty
 * A single interactive unit for the mini-map.
 * For islands, it includes an invisible hit-area circle to handle offshore sea areas.
 */
export const MiniMapCounty: React.FC<MiniMapCountyProps> = ({
  id,
  name,
  pathData,
  isIsland,
  center,
  isActive,
  onSelect,
  onHover,
}) => (
  <g
    className={`atlas-mini-map-card__county-group ${isIsland ? 'is-island-group' : ''} ${isActive ? 'is-active' : ''}`}
    onClick={(e) => {
      e.stopPropagation()
      onSelect(id)
    }}
    onMouseEnter={() => onHover(name)}
    onMouseLeave={() => onHover(null)}
  >
    {/* Hit Area for Islands (Rendered behind to not block neighbors if they are overlapping) */}
    {isIsland && center && (
      <circle
        cx={center.x}
        cy={center.y}
        r="20"
        className="atlas-mini-map-card__island-hit"
      />
    )}
    <path
      d={pathData}
      className={`atlas-mini-map-card__path ${isIsland ? 'is-island' : ''}`}
      style={isIsland ? { pointerEvents: 'none' } : undefined}
    />
  </g>
)
