import { formatStudents } from '../lib/analytics'

type BoxPlotGroup = {
  id: string
  label: string
  values: number[]
}

type BoxPlotChartProps = {
  title: string
  subtitle: string
  groups: BoxPlotGroup[]
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return 0
  const index = (values.length - 1) * ratio
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)
  if (lowerIndex === upperIndex) return values[lowerIndex]
  const weight = index - lowerIndex
  return values[lowerIndex] * (1 - weight) + values[upperIndex] * weight
}

function BoxPlotChart({ title, subtitle, groups }: BoxPlotChartProps) {
  const width = 620
  const height = 260
  const padding = { top: 20, right: 16, bottom: 42, left: 50 }
  const preparedGroups = groups
    .map((group) => {
      const values = [...group.values].sort((left, right) => left - right)
      return {
        ...group,
        min: values[0] ?? 0,
        q1: percentile(values, 0.25),
        median: percentile(values, 0.5),
        q3: percentile(values, 0.75),
        max: values.at(-1) ?? 0,
      }
    })
    .filter((group) => group.values.length > 0)

  const maxValue = Math.max(...preparedGroups.map((group) => group.max), 1)
  const stepX = (width - padding.left - padding.right) / Math.max(preparedGroups.length, 1)
  const boxWidth = Math.min(48, stepX * 0.42)
  const toY = (value: number) => height - padding.bottom - (value / maxValue) * (height - padding.top - padding.bottom)

  return (
    <section className="box-plot-chart">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">分布箱形</p>
          <h3>{title}</h3>
        </div>
        <p className="panel-heading__meta">{subtitle}</p>
      </div>

      <svg className="box-plot-chart__svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + ratio * (height - padding.top - padding.bottom)
          const value = Math.round(maxValue * (1 - ratio))
          return (
            <g key={ratio}>
              <line className="box-plot-chart__grid" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text className="box-plot-chart__axis" x={padding.left - 8} y={y + 4} textAnchor="end">{formatStudents(value)}</text>
            </g>
          )
        })}

        {preparedGroups.map((group, index) => {
          const centerX = padding.left + stepX * index + stepX / 2
          return (
            <g key={group.id}>
              <line className="box-plot-chart__whisker" x1={centerX} x2={centerX} y1={toY(group.min)} y2={toY(group.max)} />
              <line className="box-plot-chart__cap" x1={centerX - boxWidth * 0.3} x2={centerX + boxWidth * 0.3} y1={toY(group.min)} y2={toY(group.min)} />
              <line className="box-plot-chart__cap" x1={centerX - boxWidth * 0.3} x2={centerX + boxWidth * 0.3} y1={toY(group.max)} y2={toY(group.max)} />
              <rect className="box-plot-chart__box" x={centerX - boxWidth / 2} y={toY(group.q3)} width={boxWidth} height={Math.max(toY(group.q1) - toY(group.q3), 4)} rx={8} />
              <line className="box-plot-chart__median" x1={centerX - boxWidth / 2} x2={centerX + boxWidth / 2} y1={toY(group.median)} y2={toY(group.median)} />
              <text className="box-plot-chart__label" x={centerX} y={height - 12} textAnchor="middle">{group.label}</text>
            </g>
          )
        })}
      </svg>

      <div className="box-plot-chart__legend">
        {preparedGroups.map((group) => (
          <span key={group.id}>{group.label} 中位數 {formatStudents(Math.round(group.median))} 人</span>
        ))}
      </div>
    </section>
  )
}

export default BoxPlotChart