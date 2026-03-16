import { useState } from 'react'
import ScatterPlotChart from '../ScatterPlotChart'
import '../../styles/templates/dashboard-shell/01-premium-cards-system.css'
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
    matrix: true
  })

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="dashboard-side-shell__content dashboard-side-shell__content--county">
      <div className="overview-accordion">
        {derived.townshipRows.length > 0 ? (
          <div className={`accordion-item ${expandedSections.matrix ? 'accordion-item--expanded' : ''}`}>
            <button 
              className="accordion-header" 
              onClick={() => toggleSection('matrix')}
              aria-expanded={expandedSections.matrix}
            >
              <span className="accordion-icon">{expandedSections.matrix ? '−' : '+'}</span>
              <span className="accordion-title">熱點分析矩陣 (縣市分析)</span>
            </button>
            <div className="accordion-content">
              <ScatterPlotChart
                title="熱點分析矩陣 (縣市分析)"
                subtitle={`以 ${derived.selectedCounty?.name} 總學生數為分母計算佔比變動`}
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
            </div>
          </div>
        ) : (
          <div className="empty-state">請先從地圖或全台排行選擇縣市，系統將自動載入該區域的鄉鎮分析資料。</div>
        )}
      </div>
    </div>
  )
}

export default CountyTabPanel
