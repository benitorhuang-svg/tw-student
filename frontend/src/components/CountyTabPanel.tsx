import { useMemo } from 'react'

import ComparisonBarChart from './ComparisonBarChart'
import ScatterPlotChart from './ScatterPlotChart'
import InsightPanel from './InsightPanel'
import PieChart from './PieChart'
import ScopePanel from './ScopePanel'
import type { useAtlasDerivedState } from '../hooks/useAtlasDerivedState'
import type { AcademicYear, ManagementTypeFilter } from '../data/educationData'
import { formatStudents, getCountyEducationDistribution } from '../lib/analytics'

type CountyTabPanelProps = {
  derived: ReturnType<typeof useAtlasDerivedState>
  activeYear: AcademicYear
  isYearPlaybackActive: boolean
  managementType: ManagementTypeFilter
  selectedTownshipId: string | null
  countyChartView: 'comparison' | 'ranking'
  setCountyChartView: (view: 'comparison' | 'ranking') => void
  hoveredTownshipId: string | null
  setHoveredTownshipId: (id: string | null) => void
  onSelectTownship: (townshipId: string) => void
}

function CountyTabPanel({
  derived,
  activeYear,
  isYearPlaybackActive,
  managementType,
  selectedTownshipId,
  countyChartView,
  setCountyChartView,
  hoveredTownshipId,
  setHoveredTownshipId,
  onSelectTownship,
}: CountyTabPanelProps) {
  const countyDistribution = useMemo(
    () => derived.selectedCounty ? getCountyEducationDistribution(derived.selectedCounty, { managementType, year: activeYear }) : [],
    [activeYear, derived.selectedCounty, managementType],
  )
  const leadingTownship = derived.townshipRows[0] ?? null
  const averageTownshipStudents = derived.townshipRows.length > 0
    ? Math.round(derived.townshipRows.reduce((sum, row) => sum + row.students, 0) / derived.townshipRows.length)
    : 0

  return (
    <div className="dashboard-side-shell__content dashboard-side-shell__content--county">
      <section className="dashboard-card dashboard-card--kpi">
        <div className="dashboard-card__body dashboard-card__summary-body">
          <ScopePanel
            scopePath={derived.scopePath}
            scopeHeadline={derived.scopeHeadline}
            scopeDescription="聚焦單一縣市，地圖已切換到鄉鎮邊界與鄉鎮聚合點；可繼續點入鄉鎮或切到學校分析。"
            currentScope={derived.currentScope}
            activeYear={activeYear}
            isYearPlaybackActive={isYearPlaybackActive}
            educationDistribution={derived.educationDistribution}
          />
        </div>
      </section>

      <section className="dashboard-card dashboard-card--county-story">
        <div className="dashboard-card__body dashboard-card__insight-body">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">縣市結構</p>
              <h3>{derived.selectedCounty?.name ?? '縣市'} 教育結構</h3>
            </div>
            <p className="panel-heading__meta">從教育階段分布、縣內熱區與鄉鎮平均規模切入縣市分析。</p>
          </div>

          <div className="atlas-storyboard__split">
            <div className="atlas-storyboard__chart">
              <ComparisonBarChart
                items={derived.townshipRows.slice(0, 6).map((row) => ({ id: row.id, label: row.label, value: row.students }))}
                activeItemId={hoveredTownshipId ?? selectedTownshipId}
                onHoverItem={setHoveredTownshipId}
                onSelectItem={onSelectTownship}
              />
            </div>

            <div className="atlas-storyboard__chart atlas-storyboard__chart--distribution">
              {derived.townshipRows.length > 0 ? (
                <ScatterPlotChart
                  title="鄉鎮規模與變動率"
                  subtitle="X 軸看學生數、Y 軸看年變動率、圓點大小看學校數。"
                  xLabel="學生數"
                  yLabel="年變動率 (%)"
                  points={derived.townshipRows.map((row) => ({
                    id: row.id,
                    label: row.label,
                    x: row.students,
                    y: row.deltaRatio * 100,
                    size: row.schools,
                  }))}
                  activePointId={hoveredTownshipId ?? selectedTownshipId}
                  formatY={(value) => `${value.toFixed(1)}%`}
                  onHoverPoint={setHoveredTownshipId}
                  onSelectPoint={onSelectTownship}
                />
              ) : countyDistribution.length > 0 ? (
                <PieChart slices={countyDistribution.map((row) => ({ label: row.level, value: row.students, share: row.share }))} size={124} />
              ) : (
                <div className="empty-state">目前條件沒有可顯示的鄉鎮分布。</div>
              )}
            </div>
          </div>

          <div className="atlas-metric-strip atlas-metric-strip--compact">
            <article className="atlas-metric-tile atlas-metric-tile--compact">
              <span>熱區鄉鎮</span>
              <strong>{leadingTownship?.label ?? '尚無資料'}</strong>
              <small>{leadingTownship ? `${formatStudents(leadingTownship.students)} 人` : '請調整篩選條件'}</small>
            </article>
            <article className="atlas-metric-tile atlas-metric-tile--compact">
              <span>鄉鎮平均</span>
              <strong>{formatStudents(averageTownshipStudents)} 人</strong>
              <small>{derived.townshipRows.length} 個鄉鎮樣本</small>
            </article>
            <article className="atlas-metric-tile atlas-metric-tile--compact">
              <span>可下鑽學校層</span>
              <strong>{formatStudents(derived.currentScope.schools)} 校</strong>
              <small>點選鄉鎮即可切到各校分析</small>
            </article>
          </div>
        </div>
      </section>

      <section className="dashboard-card dashboard-card--ranking">
        <div className="dashboard-card__body dashboard-card__ranking-body">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">鄉鎮聚焦</p>
              <h3>{derived.selectedCounty?.name ?? '縣市'} 鄉鎮排行</h3>
            </div>
            <p className="panel-heading__meta">點選鄉鎮後，地圖會放大到各校層級並同步切到學校分析。</p>
          </div>
          <div className="chart-pill-row" role="tablist" aria-label="縣市分析圖表切換">
            <button
              type="button"
              role="tab"
              aria-selected={countyChartView === 'comparison'}
              className={countyChartView === 'comparison' ? 'chip chip--active' : 'chip'}
              onClick={() => setCountyChartView('comparison')}
            >
              鄉鎮量體
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={countyChartView === 'ranking'}
              className={countyChartView === 'ranking' ? 'chip chip--active' : 'chip'}
              onClick={() => setCountyChartView('ranking')}
            >
              鄉鎮排行
            </button>
          </div>
          {countyChartView === 'comparison' ? (
            <ComparisonBarChart items={derived.townshipRows.slice(0, 8).map((row) => ({ id: row.id, label: row.label, value: row.students }))} activeItemId={hoveredTownshipId ?? selectedTownshipId} onHoverItem={setHoveredTownshipId} onSelectItem={onSelectTownship} />
          ) : (
            <InsightPanel
              title="鄉鎮排行"
              subtitle="點選鄉鎮即可進入各校分析"
              showHeader={false}
              rows={derived.townshipRows}
              activeRowId={selectedTownshipId}
              onSelectRow={onSelectTownship}
              onHoverRow={setHoveredTownshipId}
              emptyMessage="目前縣市條件沒有可顯示的鄉鎮資料。"
            />
          )}
        </div>
      </section>
    </div>
  )
}

export default CountyTabPanel
