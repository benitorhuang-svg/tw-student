import { useState, useMemo } from 'react'
import OverviewAccordion from '../molecules/OverviewAccordion'
import OverviewMatrixSection from '../molecules/OverviewMatrixSection'
import OverviewTrendSection from '../molecules/OverviewTrendSection'
import OverviewTreemapSection from '../molecules/OverviewTreemapSection'
import OverviewRankingSection from '../molecules/OverviewRankingSection'
import type { useAtlasDerivedState } from '../../hooks/useAtlasDerivedState'
import type { TrendPoint } from '../../lib/analytics.types'

type OverviewTabPanelProps = {
  derived: ReturnType<typeof useAtlasDerivedState>
  hoveredCountyId: string | null
  selectedCountyId: string | null
  setHoveredCountyId: (id: string | null) => void
  handlePrefetchCounty: (id: string | null) => void
  scenarioActions: {
    handleCountySelect: (id: string, options?: { skipTabSwitch?: boolean, zoom?: number }) => void
  }
  nationalEducationTrendSeries: Array<{ label: string, points: TrendPoint[] }>
}

function OverviewTabPanel({
  derived,
  hoveredCountyId,
  selectedCountyId,
  setHoveredCountyId,
  handlePrefetchCounty,
  scenarioActions,
  nationalEducationTrendSeries
}: OverviewTabPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hero: false,
    matrix: true,
    trend: false,
    ranking: false,
    treemap: false
  })

  const toggleSection = (id: string) => {
    // Exclusive accordion effect: close others when opening one
    setExpandedSections(prev => {
      const isCurrentlyExpanded = prev[id]
      const next: Record<string, boolean> = {}
      // If we're expanding it, close all others. If we're closing it, just close it.
      Object.keys(prev).forEach(key => {
        next[key] = false
      })
      if (!isCurrentlyExpanded) {
        next[id] = true
      }
      return next
    })
  }

  // Memoized derived data for charts
  const matrixPoints = useMemo(() => derived.countyRankingRows.map((row) => ({
    id: row.id,
    label: row.label,
    x: row.students,
    y: (row.delta / Math.max(derived.globalNationalSummary?.students ?? 0, 1)) * 100,
    size: row.schools,
  })), [derived.countyRankingRows, derived.globalNationalSummary])

  const treemapGroups = useMemo(() => {
    const regions = ['北部', '中部', '南部', '東部', '離島']
    const regionColors: Record<string, string> = {
      '北部': '#3b82f6',
      '中部': '#10b981',
      '南部': '#f59e0b',
      '東部': '#8b5cf6',
      '離島': '#6366f1'
    }
    
    return regions.map(reg => {
      const counties = derived.countyRankingRows.filter(c => c.subLabel === reg)
      return {
        id: reg,
        label: reg,
        value: counties.reduce((sum, c) => sum + c.students, 0),
        accentColor: regionColors[reg] || '#94a3b8',
        children: counties.map(c => ({
          id: c.id,
          label: c.label,
          value: c.students
        }))
      }
    }).filter(g => g.value > 0)
  }, [derived.countyRankingRows])

  return (
    <div className="dashboard-side-shell__content dashboard-side-shell__content--overview">
      <OverviewAccordion
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
        heroSection={null}
        matrixSection={
          <OverviewMatrixSection
            points={matrixPoints}
            activePointId={hoveredCountyId ?? selectedCountyId}
            onHoverPoint={(id) => {
              setHoveredCountyId(id)
              handlePrefetchCounty(id)
            }}
            onSelectPoint={(id) => scenarioActions.handleCountySelect(id, { skipTabSwitch: true, zoom: 9 })}
          />
        }
        trendSection={
          <OverviewTrendSection series={nationalEducationTrendSeries} />
        }
        rankingSection={
          <OverviewRankingSection 
            rankingRows={derived.countyRankingRows}
            onSelectCounty={(id: string) => scenarioActions.handleCountySelect(id, { skipTabSwitch: true, zoom: 9 })}
          />
        }
        treemapSection={
          <OverviewTreemapSection
            groups={treemapGroups}
            activeLeafId={hoveredCountyId ?? selectedCountyId}
            onSelectLeaf={(id) => scenarioActions.handleCountySelect(id, { skipTabSwitch: true, zoom: 9 })}
          />
        }
      />
    </div>
  )
}

export default OverviewTabPanel
