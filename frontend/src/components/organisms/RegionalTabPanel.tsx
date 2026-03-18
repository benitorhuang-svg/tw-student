import { useMemo, useState, Suspense, lazy } from 'react'
import { ScatterPlotChart } from './ScatterPlotChart'
import { StackedAreaTrendChart } from './StackedAreaTrendChart'
import '../../styles/templates/dashboard-shell/01-premium-cards-system.css'
import type { useAtlasDerivedState } from '../../hooks/useAtlasDerivedState'
import type { RegionGroupFilter } from '../../data/educationData'
import type { CountyComparisonSummary, TrendPoint } from '../../lib/analytics'
import type { InvestigationItem, InvestigationFilter, SavedComparisonScenario, DataNote } from '../../hooks/types'
import AccordionItem from '../atoms/AccordionItem'
import KPIGrid from '../molecules/KPIGrid'
import { formatDelta, formatPercent } from '../../lib/analytics'

const ComparisonPanel = lazy(() => import('../ComparisonPanel'))
const AnomalyPanel = lazy(() => import('./AnomalyPanel'))

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
  // Comparison & Anomaly props
  comparisonScenarioName: string
  onChangeScenarioName: (name: string) => void
  effectiveComparisonCountyIds: string[]
  comparisonCandidates: Array<{ id: string; displayName: string }>
  comparisonSummaries: CountyComparisonSummary[]
  favoriteScenarios: SavedComparisonScenario[]
  recentScenarios: SavedComparisonScenario[]
  activeScenarioSnapshot: SavedComparisonScenario | null
  copyFeedbackMessage: string | null
  scenarioFeedbackMessage: string | null
  onToggleCounty: (countyId: string) => void
  onCopyLink: () => void
  onSaveScenario: () => void
  onExportScenarios: () => void
  onImportScenarios: (event: React.ChangeEvent<HTMLInputElement>) => void
  onApplyScenario: (scenario: SavedComparisonScenario) => void
  onTogglePinScenario: (scenarioId: string) => void
  onRenameScenario: (scenarioId: string) => void
  onRemoveScenario: (scenarioId: string) => void
  filteredAnomalies: InvestigationItem[]
  activeInvestigation: InvestigationItem | null
  selectedInvestigationId: string | null
  investigationFilter: InvestigationFilter
  anomaliesCounts: Record<InvestigationFilter, number>
  scopeNotes: DataNote[]
  onSelectInvestigation: (id: string) => void
  onSetFilter: (filter: InvestigationFilter) => void
  onDownloadInvestigation: (item: InvestigationItem) => void
  onDownloadAll: () => void
}

function RegionalTabPanel({
  derived,
  region,
  hoveredCountyId,
  selectedCountyId,
  setHoveredCountyId,
  scenarioActions,
  handlePrefetchCounty,
  comparisonScenarioName,
  onChangeScenarioName,
  effectiveComparisonCountyIds,
  comparisonCandidates,
  comparisonSummaries,
  favoriteScenarios,
  recentScenarios,
  activeScenarioSnapshot,
  copyFeedbackMessage,
  scenarioFeedbackMessage,
  onToggleCounty,
  onCopyLink,
  onSaveScenario,
  onExportScenarios,
  onImportScenarios,
  onApplyScenario,
  onTogglePinScenario,
  onRenameScenario,
  onRemoveScenario,
  filteredAnomalies,
  activeInvestigation,
  selectedInvestigationId,
  investigationFilter,
  anomaliesCounts,
  scopeNotes,
  onSelectInvestigation,
  onSetFilter,
  onDownloadInvestigation,
  onDownloadAll
}: RegionalTabPanelProps) {
  const regionSummaries = useMemo(() => [...derived.regionalComparisonRows].sort((left, right) => right.students - left.students), [derived.regionalComparisonRows])

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hero: true,
    matrix: false,
    trend: false,
    comparison: false,
    anomaly: false
  })

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const isCurrentlyExpanded = prev[id]
      const next: Record<string, boolean> = {}
      Object.keys(prev).forEach(key => {
        next[key] = false
      })
      if (!isCurrentlyExpanded) {
        next[id] = true
      }
      return next
    })
  }

  return (
    <div className="dashboard-side-shell__content dashboard-side-shell__content--regional">
      <div className="overview-accordion">
        {region !== '全部' && (
          <AccordionItem
            id="hero"
            title={`${region} 核心指標概覽`}
            isExpanded={expandedSections.hero}
            onToggle={toggleSection}
            style={{ animationDelay: '0.05s' }}
          >
            <KPIGrid 
              className="kpi-grid--compact"
              columns={3}
              items={[
                { 
                  label: `${region} 學生總數`, 
                  value: ((regionSummaries.find(r => r.id === region)?.students ?? 0) / 10000).toFixed(1), 
                  unit: '萬',
                  meta: `佔全台約 ${formatPercent((regionSummaries.find(r => r.id === region)?.students ?? 0) / Math.max(derived.globalNationalSummary?.students ?? 1, 1))}`,
                  sparklineData: regionSummaries.find(r => r.id === region)?.trend?.map((point: TrendPoint) => point.value)
                },
                { 
                  label: '年度消長趨勢', 
                  value: formatDelta(regionSummaries.find(r => r.id === region)?.delta ?? 0), 
                  unit: '人',
                  trend: {
                    value: formatPercent(regionSummaries.find(r => r.id === region)?.deltaRatio ?? 0),
                    isPositive: (regionSummaries.find(r => r.id === region)?.deltaRatio ?? 0) > 0
                  },
                  sparklineData: regionSummaries.find(r => r.id === region)?.trend?.map((point: TrendPoint) => point.value)
                },
                {
                  label: '區域縣市構成',
                  value: derived.countySummaries.filter(c => c.region === region && !c.filteredOut).length,
                  unit: '縣市',
                  meta: '完成數據鎖定'
                }
              ]}
            />
          </AccordionItem>
        )}
        <AccordionItem
          id="matrix"
          title="區域成長潛力矩陣"
          isExpanded={expandedSections.matrix}
          onToggle={toggleSection}
          style={{ animationDelay: '0.1s' }}
        >
          <ScatterPlotChart
            title=""
            subtitle={null}
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
            flat={true}
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
              flat={true}
            >
              <p className="dashboard-card__subtitle" style={{ margin: 0, opacity: 0.8 }}>
                顯示本區域特有的各教育階段人數消長趨勢
              </p>
            </StackedAreaTrendChart>
          </AccordionItem>
        )}

        <Suspense fallback={<div className="empty-state">載入進階分析…</div>}>
          <AccordionItem
            id="comparison"
            title="縣市消長對照分析"
            isExpanded={expandedSections.comparison}
            onToggle={toggleSection}
            style={{ animationDelay: '0.25s' }}
          >
            <ComparisonPanel
              comparisonScenarioName={comparisonScenarioName}
              onChangeScenarioName={onChangeScenarioName}
              effectiveComparisonCountyIds={effectiveComparisonCountyIds}
              comparisonCandidates={comparisonCandidates}
              comparisonSummaries={comparisonSummaries}
              favoriteScenarios={favoriteScenarios}
              recentScenarios={recentScenarios}
              activeScenarioSnapshot={activeScenarioSnapshot}
              favoriteScenarioIds={scenarioActions.favoriteScenarioIds}
              copyFeedback={copyFeedbackMessage}
              scenarioFeedback={scenarioFeedbackMessage}
              onToggleCounty={onToggleCounty}
              onCopyLink={onCopyLink}
              onSaveScenario={onSaveScenario}
              onExportScenarios={onExportScenarios}
              onImportScenarios={onImportScenarios}
              onApplyScenario={onApplyScenario}
              onTogglePinScenario={onTogglePinScenario}
              onRenameScenario={onRenameScenario}
              onRemoveScenario={onRemoveScenario}
              flat={true}
            />
          </AccordionItem>

          <AccordionItem
            id="anomaly"
            title="異常資料調查面板"
            isExpanded={expandedSections.anomaly}
            onToggle={toggleSection}
            style={{ animationDelay: '0.3s' }}
          >
            <AnomalyPanel
              filteredAnomalies={filteredAnomalies}
              activeInvestigation={activeInvestigation}
              selectedInvestigationId={selectedInvestigationId}
              investigationFilter={investigationFilter}
              anomaliesCounts={anomaliesCounts}
              scopeNotes={scopeNotes}
              scopeHeadline={region === '全部' ? '全台範圍' : region}
              onSelectInvestigation={onSelectInvestigation}
              onSetFilter={onSetFilter}
              onDownloadInvestigation={onDownloadInvestigation}
              onDownloadAll={onDownloadAll}
              flat={true}
            />
          </AccordionItem>
        </Suspense>
      </div>
    </div>
  )
}

export default RegionalTabPanel
