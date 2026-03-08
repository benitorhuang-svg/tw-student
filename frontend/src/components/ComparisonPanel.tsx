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
}: ComparisonPanelProps) {
  return (
    <section className="panel comparison-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">比較工作台</p>
          <h3>縣市交叉比較</h3>
        </div>
        <p className="panel-heading__meta">可同時鎖定 4 個縣市，並把情境名稱與組合直接寫入 URL 分享。</p>
      </div>

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
        {comparisonSummaries.map((county) => (
          <article key={county.id} className="comparison-card">
            <div className="comparison-card__header">
              <div>
                <strong>{county.name}</strong>
                <span>{county.region}</span>
              </div>
              <span>{formatDelta(county.delta)}</span>
            </div>
            <div className="comparison-card__stats">
              <span>{formatStudents(county.students)} 人</span>
              <span>{county.schools} 校</span>
              <span>{formatPercent(county.deltaRatio)}</span>
            </div>
            <div className="comparison-card__distribution">
              {county.distribution.map((row) => (
                <div key={`${county.id}-${row.level}`} className="comparison-card__distribution-row">
                  <div>
                    <strong>{row.level}</strong>
                    <span>{formatStudents(row.students)} 人 / {row.schools} 校</span>
                  </div>
                  <div className="distribution-bar">
                    <div className="distribution-bar__fill" style={{ width: `${Math.max(row.share * 100, row.students > 0 ? 8 : 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
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
            <strong>最近開啟</strong>
            <span>{recentScenarios.length.toLocaleString('zh-TW')} 筆</span>
          </div>
          <div className="scenario-library__list">
            {recentScenarios.length === 0 ? <span className="comparison-panel__feedback">尚未建立最近清單</span> : null}
            {recentScenarios.map((scenario) => (
              <button key={scenario.id} type="button" className={activeScenarioSnapshot?.id === scenario.id ? 'scenario-recent scenario-recent--active' : 'scenario-recent'} onClick={() => onApplyScenario(scenario)}>
                <strong>{scenario.name}</strong>
                <span>{scenario.countyIds.join('、')}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

export default ComparisonPanel
