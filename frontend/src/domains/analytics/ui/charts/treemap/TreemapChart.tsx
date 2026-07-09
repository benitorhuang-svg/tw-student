import { useMemo, useState } from 'react'

import { useChartAnimation } from '@/shared/lib/hooks/core/useChartAnimation'
import { formatStudents } from '@/shared/lib/analytics'
import {
  TREEMAP_CANVAS_HEIGHT,
  TREEMAP_CANVAS_WIDTH,
  squarify,
  type LayoutRect,
} from './layout'
import type { TreemapChartProps, TreemapGroup } from './types'

function TreemapChart({
  title,
  subtitle,
  groups,
  activeLeafId = null,
  onSelectLeaf,
  onSelectGroup,
  className,
  flat,
  showHeader = true,
  children,
}: TreemapChartProps) {
  const { ref, isVisible } = useChartAnimation()
  const [detailKey, setDetailKey] = useState<string | null>(null)

  const combinedClasses = [
    'dashboard-card',
    'treemap-chart',
    flat ? 'dashboard-card--flat' : '',
    isVisible ? 'chart-enter chart-enter--visible' : 'chart-enter',
    className || ''
  ].filter(Boolean).join(' ')

  // Groups as columns as per reference design
  // Ensure a minimum visual width for groups even if population is tiny (e.g. Islands)
  const MIN_RATIO = 0.08 
  const totalValue = groups.reduce((sum, g) => sum + g.value, 0)
  
  // Calculate raw ratios and apply floors
  const ratios = groups.map(g => Math.max(g.value / (totalValue || 1), MIN_RATIO))
  const normalizedTotalRatio = ratios.reduce((a, b) => a + b, 0)
  
  const groupLayouts = groups.reduce((acc, group, idx) => {
    const groupWidth = (ratios[idx] / normalizedTotalRatio) * TREEMAP_CANVAS_WIDTH
    acc.rects.push({ node: group, x: acc.cursor, y: 0, width: groupWidth, height: TREEMAP_CANVAS_HEIGHT })
    acc.cursor += groupWidth
    return acc
  }, { rects: [] as LayoutRect<TreemapGroup>[], cursor: 0 }).rects

  const detail = useMemo(() => {
    if (!detailKey) return null
    if (detailKey.startsWith('group:')) {
      const group = groups.find((item) => item.id === detailKey.replace('group:', ''))
      return group ? { 
        title: group.label, 
        actualValue: `${formatStudents(group.value)} 人`,
        meta: `${group.children.length} 個縣市 / 區域`
      } : null
    }

    const leafId = detailKey.replace('leaf:', '')
    for (const group of groups) {
      const leaf = group.children.find((item) => item.id === leafId)
      if (leaf) {
        return {
          title: leaf.label,
          actualValue: `${formatStudents(leaf.value)} 人`,
          meta: leaf.meta ?? `${group.label} / 子層級資料項`,
        }
      }
    }

    return null
  }, [detailKey, groups])

  if (groups.length === 0) {
    return (
      <section ref={ref as React.RefObject<HTMLElement>} className="treemap-chart">
        <div className="panel-heading treemap-chart__heading"><div><h3>{title}</h3></div></div>
        <div className="chart-empty-state">尚無資料</div>
      </section>
    )
  }

  return (
    <section className={combinedClasses} ref={ref as React.RefObject<HTMLElement>}>
      {showHeader && (
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">{title}</h3>
            {subtitle && <p className="dashboard-card__subtitle">{subtitle}</p>}
            {children}
          </div>
        </div>
      )}

      <div className="dashboard-card__body">

      <div className="treemap-chart__canvas" role="list" aria-label={title}>
        <div className="treemap-chart__columns">
          {groupLayouts.map((groupLayout) => {
            const group = groupLayout.node
            const childLayouts = squarify(
              group.children,
              0,
              0,
              groupLayout.width,
              TREEMAP_CANVAS_HEIGHT,
            )

            return (
              <div
                key={group.id}
                className="treemap-chart__group-column"
                style={{
                  flex: `${Math.max(group.value, 1)} 1 0px`,
                  ['--treemap-accent' as string]: group.accentColor,
                }}
              >
                <button
                  type="button"
                  className="treemap-chart__column-header"
                  onClick={() => {
                    setDetailKey(`group:${group.id}`)
                    onSelectGroup?.(group.id)
                  }}
                  onMouseEnter={() => setDetailKey(`group:${group.id}`)}
                  onMouseLeave={() => setDetailKey(null)}
                >
                  <span>{group.label}</span>
                </button>

                <div className="treemap-chart__leaf-container">
                  {childLayouts.map((childLayout) => {
                    const child = childLayout.node
                    const isActive = child.id === activeLeafId
                    return (
                      <button
                        key={child.id}
                        type="button"
                        className={isActive ? 'treemap-chart__leaf treemap-chart__leaf--active' : 'treemap-chart__leaf'}
                        style={{
                          left: `calc(${(childLayout.x / groupLayout.width) * 100}% + 0.5px)`,
                          top: `calc(${(childLayout.y / TREEMAP_CANVAS_HEIGHT) * 100}% + 0.5px)`,
                          width: `calc(${(childLayout.width / groupLayout.width) * 100}% - 1px)`,
                          height: `calc(${(childLayout.height / TREEMAP_CANVAS_HEIGHT) * 100}% - 1px)`,
                        }}
                        onClick={() => {
                          setDetailKey(`leaf:${child.id}`)
                          onSelectLeaf?.(child.id)
                        }}
                        onMouseEnter={() => setDetailKey(`leaf:${child.id}`)}
                        onMouseLeave={() => setDetailKey(null)}
                        aria-label={`${group.label} ${child.label} ${(child.value / 10000).toFixed(1)} 萬`}
                      >
                        <div className="treemap-chart__leaf-content">
                          <span className="treemap-chart__leaf-label">{child.label}</span>
                          <strong className="treemap-chart__leaf-value">
                            {(child.value / 10000).toFixed(1)}萬
                          </strong>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {detail ? (
        <div className="chart-tooltip chart-tooltip--visible treemap-chart__tooltip" 
             style={{ 
               position: 'absolute', 
               top: 10, 
               right: 45, 
               width: 175, 
               pointerEvents: 'none', 
               zIndex: 10,
               background: 'rgba(15, 23, 42, 0.95)',
               backdropFilter: 'blur(8px)',
               padding: '10px 14px',
               borderRadius: '12px',
               boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
               border: '1px solid rgba(255, 255, 255, 0.1)'
             }}
             role="note" aria-live="polite">
          <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
            <span>{detail.title}</span>
            <span style={{ fontSize: '11px', opacity: 0.9, fontWeight: 900 }}>{detail.actualValue}</span>
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
            {detail.meta}
          </div>
        </div>
      ) : null}
      </div>
    </section>
  )
}

export default TreemapChart
