const PIE_COLORS = [
  'rgba(56, 189, 248, 0.85)',
  'rgba(52, 211, 153, 0.85)',
  'rgba(251, 191, 36, 0.85)',
  'rgba(251, 146, 60, 0.85)',
  'rgba(168, 85, 247, 0.85)',
  'rgba(148, 163, 184, 0.6)',
]

type Slice = {
  label: string
  value: number
  share: number
}

type PieChartProps = {
  slices: Slice[]
  size?: number
}

function PieChart({ slices, size = 90 }: PieChartProps) {
  const r = size / 2
  const cx = r
  const cy = r
  const innerR = r * 0.52

  const startOffset = -Math.PI / 2
  const offsets = slices.reduce<number[]>((acc, slice) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : startOffset
    acc.push(prev + slice.share * Math.PI * 2)
    return acc
  }, [])

  const paths = slices.map((slice, i) => {
    const angle = slice.share * Math.PI * 2
    const startAngle = i === 0 ? startOffset : offsets[i - 1]
    const endAngle = startAngle + angle

    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const ix1 = cx + innerR * Math.cos(endAngle)
    const iy1 = cy + innerR * Math.sin(endAngle)
    const ix2 = cx + innerR * Math.cos(startAngle)
    const iy2 = cy + innerR * Math.sin(startAngle)
    const large = angle > Math.PI ? 1 : 0

    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ')

    return <path key={slice.label} d={d} fill={PIE_COLORS[i % PIE_COLORS.length]} />
  })

  return (
    <div className="pie-chart-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="教育階段佔比">
        {paths}
      </svg>
      <div className="pie-chart-legend">
        {slices.map((slice, i) => (
          <div key={slice.label} className="pie-chart-legend__row">
            <span className="pie-chart-legend__swatch" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="pie-chart-legend__label">{slice.label}</span>
            <span className="pie-chart-legend__value">{(slice.share * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PieChart
