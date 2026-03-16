import { useMemo, useState } from 'react'
import ScatterPlotChart from '../ScatterPlotChart'
import StackedAreaTrendChart from '../StackedAreaTrendChart'
import '../../styles/templates/dashboard-shell/01-premium-cards-system.css'
import type { useAtlasDerivedState } from '../../hooks/useAtlasDerivedState'
import type { RegionGroupFilter } from '../../data/educationData'
import type { InvestigationItem } from '../../hooks/types'

type RegionalTabPanelProps = {
  derived: ReturnType<typeof useAtlasDerivedState>
  region: RegionGroupFilter
  hoveredCountyId: string | null
  selectedCountyId: string | null
  setHoveredCountyId: (id: string | null) => void
  scenarioActions: {
    handleRegionSelect: (region: RegionGroupFilter, options?: { skipTabSwitch?: boolean, zoom?: number }) => void
    handleCountySelect: (countyId: string, options?: { skipTabSwitch?: boolean, zoom?: number }) => void;
    favoriteScenarioIds: Set<string>
    handleDownloadInvestigation: (item: InvestigationItem) => void
    handleDownloadAllInvestigations: () => void
  }
  handlePrefetchCounty: (countyId: string | null) => void
}

function RegionalTabPanel({
  derived,
  region,
  hoveredCountyId,
  selectedCountyId,
  setHoveredCountyId,
  scenarioActions,
  handlePrefetchCounty,
}: RegionalTabPanelProps) {
  const regionSummaries = useMemo(() => [...derived.regionalComparisonRows].sort((left, right) => right.students - left.students), [derived.regionalComparisonRows])

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    matrix: true,
    trend: false
  })

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="dashboard-side-shell__content dashboard-side-shell__content--regional">
      <div className="overview-accordion">
        <div className={`accordion-item stagger-item ${expandedSections.matrix ? 'accordion-item--expanded' : ''}`} style={{ animationDelay: '0.1s' }}>
          <button 
            className="accordion-header" 
            onClick={() => toggleSection('matrix')}
            aria-expanded={expandedSections.matrix}
          >
            <span className="accordion-icon">{expandedSections.matrix ? '−' : '+'}</span>
            <span className="accordion-title">熱點分析矩陣 (區域分析)</span>
          </button>
          <div className="accordion-content">
            <ScatterPlotChart
              title="熱點分析矩陣 (區域分析)"
              subtitle={region === '全部' ? '以全台總學生數為分母計算佔比變動' : `以 ${region} 總學生數為分母計算佔比變動`}
              xLabel="學生數"
              yLabel="區域佔比變動率 (%)"
              points={region === '全部' ? 
                regionSummaries.map((item) => ({
                  id: item.id,
                  label: item.label,
                  x: item.students,
                  y: (item.delta / Math.max(derived.globalNationalSummary?.students ?? 0, 1)) * 100,
                  size: item.schools
                })) :
                derived.countySummaries
                  .filter(c => c.region === region && !c.filteredOut)
                  .map(c => {
                    const regionalTotal = regionSummaries.find(r => r.id === region)?.students ?? 1;
                    return {
                      id: c.id,
                      label: c.name,
                      x: c.students,
                      y: (c.delta / Math.max(regionalTotal, 1)) * 100,
                      size: c.schools
                    };
                  })
              }
              activePointId={hoveredCountyId ?? selectedCountyId}
              onHoverPoint={(id: string | null) => {
                setHoveredCountyId(id);
                if (region !== '全部' && id) {
                  handlePrefetchCounty(id);
                }
              }}
              onSelectPoint={(id: string) => {
                if (region === '全部') {
                  scenarioActions.handleRegionSelect(id as RegionGroupFilter, { skipTabSwitch: true, zoom: 9 });
                  return;
                }
                scenarioActions.handleCountySelect(id, { skipTabSwitch: true, zoom: 9 });
              }}
              className="matrix-chart-premium"
              showHeader={false}
            />
          </div>
        </div>

        <div className={`accordion-item stagger-item ${expandedSections.trend ? 'accordion-item--expanded' : ''}`} style={{ animationDelay: '0.2s' }}>
          <button 
            className="accordion-header" 
            onClick={() => toggleSection('trend')}
            aria-expanded={expandedSections.trend}
          >
            <span className="accordion-icon">{expandedSections.trend ? '−' : '+'}</span>
            <span className="accordion-title">
              {region === '全部' ? '全台各學制歷年學生數' : `${region} 各學制歷年學生數`}
            </span>
          </button>
          <div className="accordion-content">
            <StackedAreaTrendChart
              title={region === '全部' ? '全台各學制歷年學生數' : `${region} 各學制歷年學生數`}
              subtitle={undefined}
              series={derived.nationalEducationTrendSeries}
              className="dashboard-card--regional-story dashboard-card--premium"
              showHeader={false}
            >
              <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
                各教育階段歷年人數變化趨勢
              </p>
            </StackedAreaTrendChart>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegionalTabPanel
