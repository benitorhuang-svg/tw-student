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
      <ScopePanel
        scopePath={derived.scopePath}
        scopeHeadline={derived.scopeHeadline}
        scopeDescription="聚焦單一縣市，地圖已切換到鄉鎮邊界與鄉鎮聚合點；可繼續點入鄉鎮或切到學校分析。"
        currentScope={derived.currentScope}
        activeYear={activeYear}
        isYearPlaybackActive={isYearPlaybackActive}
        educationDistribution={derived.educationDistribution}
        flat={true}
        className="dashboard-card--kpi"
      />

      <section className="dashboard-card dashboard-card--county-story">
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">{derived.selectedCounty?.name ?? '縣市'}發展概覽</h3>
            <p className="dashboard-card__subtitle">鄉鎮規模與變動率分佈</p>
          </div>
        </div>

        <div className="dashboard-card__body dashboard-card__insight-body">
          <div className="atlas-storyboard__split atlas-storyboard__split--county" data-testid="county-storyboard-split">
            <div className="atlas-storyboard__chart atlas-storyboard__chart--county-comparison">
              <ComparisonBarChart
                items={derived.townshipRows.slice(0, 6).map((row) => ({ id: row.id, label: row.label, value: row.students }))}
                activeItemId={hoveredTownshipId ?? selectedTownshipId}
                onHoverItem={setHoveredTownshipId}
                onSelectItem={onSelectTownship}
              />
            </div>

            <div className="atlas-storyboard__chart atlas-storyboard__chart--distribution atlas-storyboard__chart--county-distribution" data-testid="county-distribution-chart">
              {derived.townshipRows.length > 0 ? (
                <ScatterPlotChart
                  title="鄉鎮規模與變動率"
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
                  flat={true}
                  showHeader={false}
                />
              ) : countyDistribution.length > 0 ? (
                <div className="county-storyboard__fallback-pie" data-testid="county-fallback-pie">
                  <p className="eyebrow eyebrow--brass">條件降級摘要</p>
                  <PieChart slices={countyDistribution.map((row) => ({ label: row.level, value: row.students, share: row.share }))} size={124} />
                </div>
              ) : (
                <div className="chart-empty-state">目前條件沒有可顯示的鄉鎮分布。</div>
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
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">鄉鎮排行與熱區掃描</h3>
            <p className="dashboard-card__subtitle">依學生總數排序</p>
          </div>

          <div className="dashboard-card__actions">
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
          </div>
        </div>

        <div className="dashboard-card__body dashboard-card__ranking-body">
          {countyChartView === 'comparison' ? (
            <ComparisonBarChart items={derived.townshipRows.slice(0, 8).map((row) => ({ id: row.id, label: row.label, value: row.students }))} activeItemId={hoveredTownshipId ?? selectedTownshipId} onHoverItem={setHoveredTownshipId} onSelectItem={onSelectTownship} />
          ) : (
            <InsightPanel
              title="鄉鎮排行"
              subtitle="點選鄉鎮即可進入各校分析"
              showHeader={true}
              rows={derived.townshipRows}
              activeRowId={selectedTownshipId}
              onSelectRow={onSelectTownship}
              onHoverRow={setHoveredTownshipId}
              emptyMessage="目前縣市條件沒有可顯示的鄉鎮資料。"
              flat={true}
            />
          )}
        </div>
      </section>
    </div >
  )
}

export default CountyTabPanel
