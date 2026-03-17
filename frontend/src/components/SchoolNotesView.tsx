import { formatDelta, type SchoolInsight } from '../lib/analytics'

type SchoolNotesViewProps = {
  selectedSchool: SchoolInsight
  flat?: boolean
}

function SchoolNotesView({ selectedSchool, flat = false }: SchoolNotesViewProps) {
  return (
    <div className={`school-notes-panel ${flat ? 'dashboard-card--flat' : 'dashboard-card'}`} data-testid="school-notes">
      {!flat && (
        <div className="dashboard-card__head">
          <div className="panel-heading__stack">
            <h3 className="dashboard-card__title">校別特徵標記</h3>
            <p className="dashboard-card__subtitle">整合缺漏年度、學校狀態與正式資料備註，便於快速確認資料可信度。</p>
          </div>
        </div>
      )}

      <div className="dashboard-card__body">
        <div className="school-notes-quick-stats">
          <div className="quick-stat-item">
            <span className="quick-stat-item__label">今年增減</span>
            <strong className="quick-stat-item__value">{formatDelta(selectedSchool.delta)} 人</strong>
          </div>
          <div className="quick-stat-item">
            <span className="quick-stat-item__label">資料完整性</span>
            <strong className="quick-stat-item__value">
              {selectedSchool.missingYears?.length ? `缺 ${selectedSchool.missingYears.join('、')}` : '正式資料完整'}
            </strong>
          </div>
          <div className="quick-stat-item">
            <span className="quick-stat-item__label">當前狀態</span>
            <strong className="quick-stat-item__value">{selectedSchool.status ?? '正常'}</strong>
          </div>
        </div>

        {selectedSchool.dataNotes && selectedSchool.dataNotes.length > 0 ? (
          <div className="note-stack">
            {selectedSchool.dataNotes.map((note) => (
              <article key={`${selectedSchool.id}-${note.type}-${note.message}`} className={`data-note data-note--${note.severity}`} data-testid="data-note">
                <strong>{note.type}</strong>
                <span>{note.message}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="school-notes-panel__empty">目前沒有正式資料異常或備註。</p>
        )}
      </div>
    </div>
  )
}

export default SchoolNotesView
