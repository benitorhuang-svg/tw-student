import { formatStackedTrendDelta } from './formatters'

type StackedTrendValueBadgeProps = {
  x: number
  y: number
  delta: number
}

export function StackedTrendValueBadge({ x, y, delta }: StackedTrendValueBadgeProps) {
  const label = formatStackedTrendDelta(delta)
  const width = Math.max(18, label.length * 7 + 6)
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={x - width / 2} y={y - 12} width={width} height={17} rx={3} fill="var(--surface-card)" opacity={0.94} />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fontSize="12"
        fontWeight="650"
        fill="var(--text-main)"
        style={{
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </text>
    </g>
  )
}
