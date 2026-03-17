import { useState } from 'react'
import { ScatterPlotChart } from './ScatterPlotChart'
import '../../styles/templates/dashboard-shell/01-premium-cards-system.css'
import '../../styles/organisms/overview-panels.css'
import '../../styles/organisms/county-panels.css'
import { 
  TownshipDistributionSection 
} from '../molecules/TownshipDistributionSection'
import { ButterflyChart } from '../molecules/ButterflyChart'
import AccordionItem from '../atoms/AccordionItem'
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
    hero: false,
    matrix: true,
    distribution: false,
    structure: false
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
      <div className="overview-accordion">

        {derived.townshipRows.length > 0 ? (
          <AccordionItem
            id="matrix"
            title="鄉鎮成長潛力矩陣"
            isExpanded={expandedSections.matrix}
            onToggle={toggleSection}
          >
            <ScatterPlotChart
              title=""
              subtitle={null}
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
              flat={true}
            />
          </AccordionItem>
        ) : (
          <div className="dashboard-card" style={{ padding: '0', textAlign: 'center' }}>
            <div className="dashboard-card__body" style={{ padding: '40px' }}>
              <div className="empty-state">請先從地圖或全台排行選擇縣市，系統將自動載入該區域的鄉鎮分析資料。</div>
            </div>
          </div>
        )}


        {derived.selectedCounty && (
          <>
            <AccordionItem
              id="distribution"
              title="鄉鎮學生規模排名"
              isExpanded={expandedSections.distribution}
              onToggle={toggleSection}
              style={{ animationDelay: '0.2s' }}
            >
              <TownshipDistributionSection 
                townships={derived.townshipRows}
                onSelectTownship={(id) => onSelectTownship(id, { skipTabSwitch: true, zoom: 12 })}
                flat={true}
              />
            </AccordionItem>

            <AccordionItem
              id="structure"
              title="各級學制與公私立結構比"
              isExpanded={expandedSections.structure}
              onToggle={toggleSection}
              style={{ animationDelay: '0.25s' }}
            >
              <ButterflyChart 
                items={structureItems}
                className="county-sidebar-butterfly"
                flat={true}
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
