import { formatStackedTrendDelta } from './formatters'

type StackedTrendValueBadgeProps = {
  x: number
  y: number
  delta: number
}

export function StackedTrendValueBadge({ x, y, delta }: StackedTrendValueBadgeProps) {
  const deltaColor = delta === 0 ? 'rgba(255,255,255,0.8)' : '#ffffff'

  return (
    <g style={{ pointerEvents: 'none' }}>
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fontSize="11"
        fontWeight="1000"
        fill={deltaColor}
        style={{
          filter: 'drop-shadow(0 0.5px 2px rgba(0,0,0,0.7))',
          letterSpacing: '-0.01em',
        }}
      >
        {formatStackedTrendDelta(delta)}
      </text>
    </g>
  )
}
