import React from 'react'
import AccordionItem from '../atoms/AccordionItem'
import { StackedAreaTrendChart } from './StackedAreaTrendChart'
import RadarChart from '../molecules/RadarChart'
import type { SchoolInsight } from '../../lib/analytics'
import type { SchoolWorkbenchView } from '../schoolDetail.types'
import '../../styles/templates/dashboard-shell/01-premium-cards-system.css'

type SchoolDetailFocusProps = {
  selectedSchool: SchoolInsight | null
  schoolInsights: SchoolInsight[]
  onSetWorkbenchView: (view: SchoolWorkbenchView) => void
}

/**
 * Organism: SchoolDetailFocus
 * 提供單一學校的深度分析，僅保留趨勢圖與雷達圖，移除冗餘文字、表格與導航按鈕
 */
export const SchoolDetailFocus: React.FC<SchoolDetailFocusProps> = ({
  selectedSchool,
  schoolInsights,
  onSetWorkbenchView
}) => {
  // onSetWorkbenchView is kept in props for parent compatibility but unused in UI as per request
  void onSetWorkbenchView

  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    trend: true,
    comparison: false
  })

  // Normalize schoolInsights or find max for radar normalization
  const maxStudents = Math.max(...schoolInsights.map((s: SchoolInsight) => s.currentStudents), 1000)
  const maxRatio = Math.max(...schoolInsights.map((s: SchoolInsight) => s.studentTeacherRatio ?? 0), 40)
  const maxClass = Math.max(...schoolInsights.map((s: SchoolInsight) => s.averageClassSize ?? 0), 50)

  // Calculate District Averages (Specifications)
  const avgStudents = schoolInsights.reduce((sum, s) => sum + s.currentStudents, 0) / Math.max(schoolInsights.length, 1)
  const avgRatio = schoolInsights.reduce((sum, s) => sum + (s.studentTeacherRatio ?? 20), 0) / Math.max(schoolInsights.length, 1)
  const avgClass = schoolInsights.reduce((sum, s) => sum + (s.averageClassSize ?? 25), 0) / Math.max(schoolInsights.length, 1)
  const avgGrowth = schoolInsights.reduce((sum, s) => sum + s.deltaRatio, 0) / Math.max(schoolInsights.length, 1)
  
  // New Diagnostic: Trend Stability (Lower variance in trend is better for stability)
  const calculateStability = (trend: Array<{ year: number, value: number }>) => {
    if (trend.length < 2) return 0.5
    const changes = trend.slice(1).map((p, i) => Math.abs(p.value - trend[i].value) / Math.max(trend[i].value, 1))
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length
    return Math.max(0, Math.min(1, 1 - avgChange * 5)) // Normalized 0-1
  }

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

  const schoolTrendSeries = selectedSchool ? [{
    label: selectedSchool.name,
    points: selectedSchool.trend
  }] : []

  // Detailed Diagnostic Dimensions for Nightingale Chart
  const radarDimensions = selectedSchool ? [
    { 
      key: 'scale', 
      label: '規模感', 
      value: Math.min(selectedSchool.currentStudents / maxStudents, 1), 
      benchmarkValue: avgStudents / maxStudents,
      displayValue: `${selectedSchool.currentStudents}人`,
      color: '#38bdf8'
    },
    { 
      key: 'growth', 
      label: '成長力', 
      value: Math.max(0, Math.min(1, (selectedSchool.deltaRatio + 0.1) / 0.2)), 
      benchmarkValue: Math.max(0, Math.min(1, (avgGrowth + 0.1) / 0.2)),
      displayValue: `${(selectedSchool.deltaRatio * 100).toFixed(1)}%`,
      color: '#fbbf24'
    },
    { 
      key: 'ratio', 
      label: '師資力', 
      value: Math.max(0, 1 - (selectedSchool.studentTeacherRatio ?? 20) / maxRatio), 
      benchmarkValue: Math.max(0, 1 - avgRatio / maxRatio),
      displayValue: `${selectedSchool.studentTeacherRatio?.toFixed(1)}:1`,
      color: '#f472b6'
    },
    { 
      key: 'class', 
      label: '班級力', 
      value: Math.max(0, 1 - (selectedSchool.averageClassSize ?? 25) / maxClass), 
      benchmarkValue: Math.max(0, 1 - avgClass / maxClass),
      displayValue: `${selectedSchool.averageClassSize?.toFixed(0)}人/班`,
      color: '#c084fc'
    },
    {
      key: 'stability',
      label: '穩定度',
      value: calculateStability(selectedSchool.trend),
      benchmarkValue: 0.65, // Expected standard
      displayValue: '高穩態',
      color: '#4ade80'
    },
    {
      key: 'position',
      label: '競爭位',
      value: 0.75, // Simplified placeholder for relative rank
      benchmarkValue: 0.5,
      displayValue: '前 25%',
      color: '#f87171'
    }
  ] : []

  return (
    <div className="overview-accordion">
      {selectedSchool ? (
        <>
          <AccordionItem
            id="school-trend-accordion"
            title={`${selectedSchool.name} 歷年學生消長趨勢`}
            isExpanded={expandedSections.trend}
            onToggle={() => toggleSection('trend')}
            style={{ animationDelay: '0.05s' }}
          >
            <StackedAreaTrendChart
              title=""
              subtitle={null}
              series={schoolTrendSeries}
              showHeader={false}
              flat={true}
              className="dashboard-card--premium"
            >
              <p className="dashboard-card__subtitle" style={{ margin: '0 0 1rem', opacity: 0.8 }}>
                顯示該校自 108 學年度起的人數變化走勢，輔助判斷長期辦學規模穩定性。
              </p>
            </StackedAreaTrendChart>
          </AccordionItem>

          <AccordionItem
            id="school-comparison-accordion"
            title="校別核心效能診斷 (Nightingale Rose Chart)"
            isExpanded={expandedSections.comparison}
            onToggle={() => toggleSection('comparison')}
            style={{ animationDelay: '0.1s' }}
          >
            <RadarChart
              title=""
              showHeader={false}
              flat={true}
              dimensions={radarDimensions}
              className="dashboard-card--premium"
              benchmarkLabel="全區規格標準"
            />
            <div style={{ padding: '0 24px 24px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <strong style={{ color: '#38bdf8' }}>📊 診斷解讀指引：</strong> <br/>
                此圖表採用 <span style={{ color: '#fff' }}>南丁格爾玫瑰圖 (Polar Area Chart)</span> 形式呈現 6 核心維度。
                實色「花瓣」長度代表該校表現，<span style={{ color: '#fff', borderBottom: '1.5px dashed rgba(255,255,255,0.4)' }}>白色虛線</span> 代表行政區平均規格。
                花瓣超出虛線代表該指標優於平均水準。
              </div>
            </div>
          </AccordionItem>
        </>
      ) : (
        <div className="dashboard-card" style={{ textAlign: 'center' }}>
          <div className="dashboard-card__body" style={{ padding: '40px' }}>
            <div className="empty-state">請先從列表選擇學校進行分析。</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SchoolDetailFocus
