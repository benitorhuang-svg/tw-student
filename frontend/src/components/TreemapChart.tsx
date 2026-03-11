import { useMemo } from 'react'

import { useChartAnimation } from '../hooks/useChartAnimation'
import { formatStudents } from '../lib/analytics'

type TreemapLeaf = {
  id: string
  label: string
  value: number
  meta?: string
}

type TreemapGroup = {
  id: string
  label: string
  value: number
  accentColor: string
  children: TreemapLeaf[]
}

type TreemapChartProps = {
  title: string
  subtitle: string
  groups: TreemapGroup[]
  activeLeafId?: string | null
  onSelectLeaf?: (id: string) => void
  onSelectGroup?: (id: string) => void
}

type LayoutRect<T> = {
  node: T
  x: number
  y: number
  width: number
  height: number
}

const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 560

function buildSliceDiceLayout<T extends { value: number }>(
  nodes: T[],
  x: number,
  y: number,
  width: number,
  height: number,
  splitVertically: boolean,
): LayoutRect<T>[] {
  const total = Math.max(nodes.reduce((sum, node) => sum + Math.max(node.value, 0), 0), 1)
  let cursor = 0

  return nodes.map((node, index) => {
    const value = Math.max(node.value, 0)
    const ratio = index === nodes.length - 1 ? 1 - cursor : value / total
    if (splitVertically) {
      const rectWidth = width * ratio
      const rect = { node, x: x + width * cursor, y, width: rectWidth, height }
      cursor += ratio
      return rect
    }

    const rectHeight = height * ratio
    const rect = { node, x, y: y + height * cursor, width, height: rectHeight }
    cursor += ratio
    return rect
  })
}

function TreemapChart({
  title,
  subtitle,
  groups,
  activeLeafId = null,
  onSelectLeaf,
  onSelectGroup,
}: TreemapChartProps) {
  const { ref, isVisible } = useChartAnimation()

  if (groups.length === 0) {
    return (
      <section ref={ref as React.RefObject<HTMLElement>} className="treemap-chart">
        <div className="panel-heading treemap-chart__heading"><div><h3>{title}</h3></div></div>
        <div className="chart-empty-state">尚無資料</div>
      </section>
    )
  }

  const groupLayouts = useMemo(
    () => buildSliceDiceLayout(groups, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, true),
    [groups],
  )

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className={isVisible ? 'treemap-chart chart-enter chart-enter--visible' : 'treemap-chart chart-enter'}
    >
      <div className="panel-heading treemap-chart__heading">
        <div>
          <p className="eyebrow">地區量體矩形圖</p>
          <h3>{title}</h3>
        </div>
        <p className="panel-heading__meta">{subtitle}</p>
      </div>

      <div className="treemap-chart__canvas" role="list" aria-label={title}>
        {groupLayouts.map((groupLayout, groupIndex) => {
          const group = groupLayout.node
          const headerHeight = Math.min(60, Math.max(34, groupLayout.height * 0.18))
          const innerPadding = 10
          const childrenHeight = Math.max(groupLayout.height - headerHeight - innerPadding * 2, 0)
          const childrenWidth = Math.max(groupLayout.width - innerPadding * 2, 0)
          const childLayouts = buildSliceDiceLayout(
            group.children,
            0,
            0,
            childrenWidth,
            childrenHeight,
            groupIndex % 2 === 0,
          )

          return (
            <article
              key={group.id}
              className="treemap-chart__group"
              style={{
                left: `${(groupLayout.x / CANVAS_WIDTH) * 100}%`,
                top: `${(groupLayout.y / CANVAS_HEIGHT) * 100}%`,
                width: `${(groupLayout.width / CANVAS_WIDTH) * 100}%`,
                height: `${(groupLayout.height / CANVAS_HEIGHT) * 100}%`,
                ['--treemap-accent' as string]: group.accentColor,
              }}
            >
              <button
                type="button"
                className="treemap-chart__group-header"
                onClick={() => onSelectGroup?.(group.id)}
              >
                <span>{group.label}</span>
                <strong>{formatStudents(group.value)} 人</strong>
              </button>

              <div className="treemap-chart__children">
                {childLayouts.map((childLayout) => {
                  const child = childLayout.node
                  const isActive = child.id === activeLeafId
                  return (
                    <button
                      key={child.id}
                      type="button"
                      className={isActive ? 'treemap-chart__leaf treemap-chart__leaf--active' : 'treemap-chart__leaf'}
                      style={{
                        left: `${(childLayout.x / Math.max(childrenWidth, 1)) * 100}%`,
                        top: `${(childLayout.y / Math.max(childrenHeight, 1)) * 100}%`,
                        width: `${(childLayout.width / Math.max(childrenWidth, 1)) * 100}%`,
                        height: `${(childLayout.height / Math.max(childrenHeight, 1)) * 100}%`,
                      }}
                      onClick={() => onSelectLeaf?.(child.id)}
                      aria-label={`${group.label} ${child.label} ${formatStudents(child.value)} 人`}
                    >
                      <span className="treemap-chart__leaf-label">{child.label}</span>
                      <strong className="treemap-chart__leaf-value">{formatStudents(child.value)}</strong>
                      {child.meta ? <small className="treemap-chart__leaf-meta">{child.meta}</small> : null}
                    </button>
                  )
                })}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default TreemapChart