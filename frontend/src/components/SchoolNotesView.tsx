import { formatDelta, type SchoolInsight } from '../lib/analytics'

type SchoolNotesViewProps = {
  selectedSchool: SchoolInsight
}

function SchoolNotesView({ selectedSchool }: SchoolNotesViewProps) {
  return (
    <div className="school-notes-panel" data-testid="school-notes">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">資料註記</p>
          <h3>{selectedSchool.name}</h3>
        </div>
        <p className="panel-heading__meta">整合缺漏年度、學校狀態與正式資料備註，便於快速確認可信度。</p>
      </div>

      <div className="school-profile-sidebar__info">
        <div className="school-profile-info-row">
          <span>今年增減</span>
          <strong>{formatDelta(selectedSchool.delta)} 人</strong>
        </div>
        <div className="school-profile-info-row">
          <span>資料完整性</span>
          <strong>{selectedSchool.missingYears?.length ? `缺 ${selectedSchool.missingYears.join('、')}` : '正式資料完整'}</strong>
        </div>
        <div className="school-profile-info-row">
          <span>狀態</span>
          <strong>{selectedSchool.status ?? '正常'}</strong>
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
  )
}

export default SchoolNotesView
