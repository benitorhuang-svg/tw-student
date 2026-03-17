import type { ChangeEvent } from 'react'
import { formatAcademicYear, formatDelta, formatPercent, formatStudents } from '../lib/analytics'
import type { SavedComparisonScenario } from '../hooks/types'
import ComparisonBarChart from './ComparisonBarChart'

type ComparisonCandidate = {
  id: string
  displayName: string
}

type ComparisonCountySummary = {
  id: string
  name: string
  region: string
  students: number
  schools: number
  delta: number
  deltaRatio: number
  distribution: { level: string; students: number; schools: number; share: number }[]
}

type ComparisonPanelProps = {
  comparisonScenarioName: string
  onChangeScenarioName: (name: string) => void
  effectiveComparisonCountyIds: string[]
  comparisonCandidates: ComparisonCandidate[]
  comparisonSummaries: ComparisonCountySummary[]
  favoriteScenarios: SavedComparisonScenario[]
  recentScenarios: SavedComparisonScenario[]
  activeScenarioSnapshot: SavedComparisonScenario | null
  favoriteScenarioIds: Set<string>
  copyFeedback: string | null
  scenarioFeedback: string | null
  onToggleCounty: (countyId: string) => void
  onCopyLink: () => void
  onSaveScenario: () => void
  onExportScenarios: () => void
  onImportScenarios: (event: ChangeEvent<HTMLInputElement>) => void
  onApplyScenario: (scenario: SavedComparisonScenario) => void
  onTogglePinScenario: (scenarioId: string) => void
  onRenameScenario: (scenarioId: string) => void
  onRemoveScenario: (scenarioId: string) => void
  className?: string
  flat?: boolean
}

function ComparisonPanel({
  comparisonScenarioName,
  onChangeScenarioName,
  effectiveComparisonCountyIds,
  comparisonCandidates,
  comparisonSummaries,
  favoriteScenarios,
  recentScenarios,
  activeScenarioSnapshot,
  favoriteScenarioIds,
  copyFeedback,
  scenarioFeedback,
  onToggleCounty,
  onCopyLink,
  onSaveScenario,
  onExportScenarios,
  onImportScenarios,
  onApplyScenario,
  onTogglePinScenario,
  onRenameScenario,
  onRemoveScenario,
  className,
  flat,
}: ComparisonPanelProps) {
  const combinedClasses = [
    'dashboard-card',
    'comparison-panel',
    flat ? 'dashboard-card--flat' : '',
    className || ''
  ].filter(Boolean).join(' ')

  return (
    <section className={combinedClasses}>
      <div className="dashboard-card__head">
        <div className="panel-heading__stack">
          <h3 className="dashboard-card__title">縣市消長對照分析</h3>
          <p className="dashboard-card__subtitle">可選取至多 4 個縣市進行同步指標對照</p>
        </div>
      </div>

      <div className="dashboard-card__body">

      <div className="comparison-panel__controls">
        <label className="filter-select comparison-panel__scenario-input">
          <span>比較情境名稱</span>
          <input value={comparisonScenarioName} onChange={(event) => onChangeScenarioName(event.target.value)} placeholder="例如：北東部少子化對照" />
        </label>
        <div className="comparison-panel__actions">
          <button type="button" className="ghost-button" onClick={onCopyLink}>
            複製分享連結
          </button>
          <button type="button" className="ghost-button" onClick={onSaveScenario}>
            收藏目前情境
          </button>
          <button type="button" className="ghost-button" onClick={onExportScenarios}>
            匯出 JSON
          </button>
          <label className="ghost-button ghost-button--file">
            匯入 JSON
            <input type="file" accept="application/json" onChange={onImportScenarios} hidden />
          </label>
          {copyFeedback ? <span className="comparison-panel__feedback">{copyFeedback}</span> : <span className="comparison-panel__feedback">compare / scenario 會自動寫入網址</span>}
          {scenarioFeedback ? <span className="comparison-panel__feedback">{scenarioFeedback}</span> : null}
        </div>
      </div>

      <div className="comparison-panel__chips">
        {comparisonCandidates.map((row) => (
          <label
            key={row.id}
            className={effectiveComparisonCountyIds.includes(row.id) ? 'chip chip--active comparison-toggle' : 'chip comparison-toggle'}
          >
            <input
              type="checkbox"
              checked={effectiveComparisonCountyIds.includes(row.id)}
              onChange={() => onToggleCounty(row.id)}
            />
            {row.displayName}
          </label>
        ))}
      </div>

      {comparisonSummaries.length > 0 && (
        <ComparisonBarChart
          items={comparisonSummaries.map((c) => ({ id: c.id, label: c.name, value: c.students }))}
        />
      )}

      <div className="comparison-grid">
        {(() => {
          const mStudents = Math.max(...comparisonSummaries.map(s => s.students), 1)
          const mDelta = Math.max(...comparisonSummaries.map(s => Math.abs(s.deltaRatio)), 0.01)

          return comparisonSummaries.map((county) => {
            const studentRatio = (county.students / mStudents) * 100
            const deltaRatio = (Math.abs(county.deltaRatio) / mDelta) * 100

            return (
              <article key={county.id} className="comparison-card">
                <div className="comparison-card__header">
                  <div className="comparison-card__title-group">
                    <div className="comparison-card__name-stack">
                      <strong>{county.name}</strong>
                      <span className="region-tag">{county.region}</span>
                    </div>
                    <div className="comparison-card__summary-bars">
                      <div className="mini-stat-bar-group" title={`規模: ${formatStudents(county.students)}`}>
                        <div className="mini-stat-bar-track">
                          <div className="mini-stat-bar-fill mini-stat-bar-fill--primary" style={{ width: `${studentRatio}%` }} />
                        </div>
                      </div>
                      <div className="mini-stat-bar-group" title={`消長: ${formatPercent(county.deltaRatio)}`}>
                        <div className="mini-stat-bar-track">
                          <div 
                            className={`mini-stat-bar-fill ${county.deltaRatio >= 0 ? 'mini-stat-bar-fill--up' : 'mini-stat-bar-fill--down'}`} 
                            style={{ width: `${deltaRatio}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`comparison-delta-pill ${county.delta >= 0 ? 'comparison-delta-pill--up' : 'comparison-delta-pill--down'}`}>
                    {formatDelta(county.delta)}
                  </div>
                </div>

                <div className="comparison-card__stats">
                  <div className="stat-pill-lite">
                    <span className="stat-label">學生數</span>
                    <span className="stat-value">{formatStudents(county.students)}</span>
                  </div>
                  <div className="stat-pill-lite">
                    <span className="stat-label">學校數</span>
                    <span className="stat-value">{county.schools}</span>
                  </div>
                  <div className="stat-pill-lite">
                    <span className="stat-label">變動率</span>
                    <span className="stat-value">{formatPercent(county.deltaRatio)}</span>
                  </div>
                </div>

                <div className="comparison-card__distribution">
                  {county.distribution.map((row) => (
                    <div key={`${county.id}-${row.level}`} className="comparison-card__distribution-row">
                      <div className="distribution-label-group">
                        <strong>{row.level}</strong>
                        <span>{formatStudents(row.students)} 人</span>
                      </div>
                      <div className="distribution-bar">
                        <div className="distribution-bar__fill" style={{ width: `${Math.max(row.share * 100, row.students > 0 ? 8 : 0)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )
          })
        })()}
      </div>

      <div className="scenario-library">
        <section className="scenario-library__section">
          <div className="scenario-library__header">
            <strong>本地收藏</strong>
            <span>{favoriteScenarios.length.toLocaleString('zh-TW')} 筆</span>
          </div>
          <div className="scenario-library__list">
            {favoriteScenarios.length === 0 ? <span className="comparison-panel__feedback">尚未收藏情境</span> : null}
            {favoriteScenarios.map((scenario) => (
              <div key={scenario.id} className={favoriteScenarioIds.has(scenario.id) && activeScenarioSnapshot?.id === scenario.id ? 'scenario-chip scenario-chip--active' : 'scenario-chip'}>
                <button type="button" className="scenario-chip__apply" onClick={() => onApplyScenario(scenario)}>
                  <strong>{scenario.name}</strong>
                  <span>{scenario.pinned ? '已釘選 / ' : ''}{scenario.countyIds.length} 縣市 / {formatAcademicYear(scenario.activeYear)}</span>
                </button>
                <button type="button" className="scenario-chip__remove" onClick={() => onTogglePinScenario(scenario.id)}>
                  {scenario.pinned ? '取消釘選' : '釘選'}
                </button>
                <button type="button" className="scenario-chip__remove" onClick={() => onRenameScenario(scenario.id)}>
                  重新命名
                </button>
                <button type="button" className="scenario-chip__remove" onClick={() => onRemoveScenario(scenario.id)}>
                  移除
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="scenario-library__section">
          <div className="scenario-library__header">
            <strong>最近開啟過</strong>
            <span>{recentScenarios.length.toLocaleString('zh-TW')} 筆數據</span>
          </div>
          <div className="scenario-library__list">
            {recentScenarios.length === 0 ? <span className="comparison-panel__feedback">尚未有最近瀏覽記錄</span> : null}
            {recentScenarios.map((scenario) => (
              <button key={scenario.id} type="button" className={activeScenarioSnapshot?.id === scenario.id ? 'scenario-recent scenario-recent--active' : 'scenario-recent'} onClick={() => onApplyScenario(scenario)}>
                <strong>{scenario.name}</strong>
                <span>{scenario.countyIds.join('、')}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      </div>
    </section>
  )
}

export default ComparisonPanel
