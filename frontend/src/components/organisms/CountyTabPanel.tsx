import { useState } from 'react'
import ScatterPlotChart from '../ScatterPlotChart'
import '../../styles/templates/dashboard-shell/01-premium-cards-system.css'
import '../../styles/organisms/overview-panels.css'
import '../../styles/organisms/county-panels.css'
import { 
  TownshipDistributionSection 
} from '../molecules/TownshipDistributionSection'
import ButterflyChart from '../ButterflyChart'
import AccordionItem from '../atoms/AccordionItem'
import KPIGrid from '../molecules/KPIGrid'
import { formatDelta, formatPercent } from '../../lib/analytics'
import { getCountyStructureDistribution } from '../../lib/analytics'
import type { useAtlasDerivedState } from '../../hooks/useAtlasDerivedState'

type CountyTabPanelProps = {
  derived: ReturnType<typeof useAtlasDerivedState>
  selectedTownshipId: string | null
  hoveredTownshipId: string | null
  setHoveredTownshipId: (id: string | null) => void
  onSelectTownship: (townshipId: string, options?: { skipTabSwitch?: boolean, zoom?: number }) => void
}

function CountyTabPanel({
  derived,
  selectedTownshipId,
  hoveredTownshipId,
  setHoveredTownshipId,
  onSelectTownship,
}: CountyTabPanelProps) {

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    matrix: true,
    distribution: false,
    structure: false
  })

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const structureItems = derived.selectedCounty 
    ? getCountyStructureDistribution(derived.selectedCounty, derived.filters?.year || 113).map(d => ({
        id: d.level,
        label: d.level.replace('院校', ''),
        leftValue: d.publicStudents,
        rightValue: d.privateStudents,
        leftLabel: '公立',
        rightLabel: '私立'
      }))
    : []

  return (
    <div className="dashboard-side-shell__content dashboard-side-shell__content--county">
      {derived.selectedCountySummary && (
        <section className="county-hero-section" style={{ marginBottom: '20px' }}>
          <KPIGrid 
            className="kpi-grid--compact"
            columns={3}
            items={[
              { 
                label: '縣市總學生數', 
                value: ((derived.selectedCountySummary?.students ?? 0) / 10000).toFixed(1), 
                unit: '萬',
                meta: `全台排名第 ${derived.countyRankingRows.findIndex(r => r.id === derived.selectedCounty?.id) + 1} 名`
              },
              { 
                label: '年度學生消長', 
                value: formatDelta(derived.selectedCountySummary?.delta ?? 0), 
                unit: '人',
                trend: {
                  value: formatPercent(derived.selectedCountySummary?.deltaRatio ?? 0),
                  isPositive: (derived.selectedCountySummary?.deltaRatio ?? 0) > 0
                }
              },
              {
                label: '轄下鄉鎮數',
                value: derived.townshipRows.length,
                unit: '區',
                meta: '完成數據掃描'
              }
            ]}
          />
        </section>
      )}

      <div className="overview-accordion">
        {derived.townshipRows.length > 0 ? (
          <AccordionItem
            id="matrix"
            title="縣市消長分佈矩陣"
            isExpanded={expandedSections.matrix}
            onToggle={toggleSection}
          >
            <ScatterPlotChart
              title="縣市消長分佈矩陣"
              subtitle={`以 ${derived.selectedCounty?.name} 學生總數為基準，掃描內部各鄉鎮的學生消長狀況`}
              xLabel="學生數"
              yLabel="縣市佔比變動率 (%)"
              points={derived.townshipRows.map((row) => ({
                id: row.id,
                label: row.label,
                x: row.students,
                y: (row.delta / Math.max(derived.selectedCountySummary?.students ?? 1, 1)) * 100,
                size: row.schools,
              }))}
              activePointId={hoveredTownshipId ?? selectedTownshipId}
              onHoverPoint={setHoveredTownshipId}
              onSelectPoint={(id) => onSelectTownship(id, { skipTabSwitch: true, zoom: 12 })}
              className="matrix-chart-premium"
              showHeader={false}
            />
          </AccordionItem>
        ) : (
          <div className="dashboard-card" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="empty-state">請先從地圖或全台排行選擇縣市，系統將自動載入該區域的鄉鎮分析資料。</div>
          </div>
        )}


        {derived.selectedCounty && (
          <>
            <AccordionItem
              id="distribution"
              title="鄉鎮學生規模排名"
              isExpanded={expandedSections.distribution}
              onToggle={toggleSection}
              style={{ marginTop: '12px' }}
            >
              <TownshipDistributionSection 
                townships={derived.townshipRows}
                onSelectTownship={(id) => onSelectTownship(id, { skipTabSwitch: true, zoom: 12 })}
              />
            </AccordionItem>

            <AccordionItem
              id="structure"
              title="各級學制與公私立結構比"
              isExpanded={expandedSections.structure}
              onToggle={toggleSection}
              style={{ marginTop: '12px' }}
            >
              <ButterflyChart 
                items={structureItems}
                className="county-sidebar-butterfly"
                flat
                hideTooltip
              />
            </AccordionItem>
          </>
        )}
      </div>
    </div>
  )
}

export default CountyTabPanel
