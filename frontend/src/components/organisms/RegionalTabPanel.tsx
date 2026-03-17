import { useMemo, useState } from 'react'
import ScatterPlotChart from '../ScatterPlotChart'
import StackedAreaTrendChart from '../StackedAreaTrendChart'
import '../../styles/templates/dashboard-shell/01-premium-cards-system.css'
import type { useAtlasDerivedState } from '../../hooks/useAtlasDerivedState'
import type { RegionGroupFilter } from '../../data/educationData'
import type { InvestigationItem } from '../../hooks/types'
import AccordionItem from '../atoms/AccordionItem'
import KPIGrid from '../molecules/KPIGrid'
import { formatDelta, formatPercent } from '../../lib/analytics'

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
      {region !== '全部' && (
        <section className="region-hero-section" style={{ marginBottom: '20px' }}>
          <KPIGrid 
            className="kpi-grid--compact"
            columns={3}
            items={[
              { 
                label: `${region} 學生總數`, 
                value: ((regionSummaries.find(r => r.id === region)?.students ?? 0) / 10000).toFixed(1), 
                unit: '萬',
                meta: `佔全台約 ${formatPercent((regionSummaries.find(r => r.id === region)?.students ?? 0) / Math.max(derived.globalNationalSummary?.students ?? 1, 1))}`
              },
              { 
                label: '年度消長趨勢', 
                value: formatDelta(regionSummaries.find(r => r.id === region)?.delta ?? 0), 
                unit: '人',
                trend: {
                  value: formatPercent(regionSummaries.find(r => r.id === region)?.deltaRatio ?? 0),
                  isPositive: (regionSummaries.find(r => r.id === region)?.deltaRatio ?? 0) > 0
                }
              },
              {
                label: '區域縣市構成',
                value: derived.countySummaries.filter(c => c.region === region && !c.filteredOut).length,
                unit: '縣市',
                meta: '完成數據鎖定'
              }
            ]}
          />
        </section>
      )}

      <div className="overview-accordion">
        <AccordionItem
          id="matrix"
          title="區域消長分佈矩陣"
          isExpanded={expandedSections.matrix}
          onToggle={toggleSection}
          style={{ animationDelay: '0.1s' }}
        >
          <ScatterPlotChart
            title="區域消長分佈矩陣"
            subtitle={region === '全部' ? '針對全台各地區進行整體規模與消長對照' : `以 ${region} 總學生人數為基準，分析縣市間的位移狀況`}
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
        </AccordionItem>

        {region !== '全部' && (
          <AccordionItem
            id="trend"
            title={`${region} 各級學制歷年學生人數`}
            isExpanded={expandedSections.trend}
            onToggle={toggleSection}
            style={{ animationDelay: '0.2s' }}
          >
            <StackedAreaTrendChart
              title={`${region} 各級學制歷年學生人數`}
              subtitle={undefined}
              series={derived.nationalEducationTrendSeries}
              className="dashboard-card--regional-story dashboard-card--premium"
              showHeader={false}
            >
              <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
                顯示本區域特有的各教育階段人數消長趨勢
              </p>
            </StackedAreaTrendChart>
          </AccordionItem>
        )}
      </div>
    </div>
  )
}

export default RegionalTabPanel
