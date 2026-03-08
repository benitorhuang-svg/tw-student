import { formatDelta, formatPercent, formatStudents, type SchoolInsight } from '../../lib/analytics'

type MobileSchoolCardListProps = {
    schools: SchoolInsight[]
    selectedSchoolId: string | null
    onSelectSchool: (schoolId: string | null) => void
}

function MobileSchoolCardList({ schools, selectedSchoolId, onSelectSchool }: MobileSchoolCardListProps) {
    if (schools.length === 0) {
        return <div className="empty-state">目前篩選條件沒有對應學校，請放寬條件或切換分析層級。</div>
    }

    return (
        <div className="mobile-school-card-list">
            {schools.map((school) => {
                const isActive = selectedSchoolId === school.id
                const isUp = school.delta > 0
                const isDown = school.delta < 0

                return (
                    <button
                        key={school.id}
                        type="button"
                        className={`mobile-school-card${isActive ? ' mobile-school-card--active' : ''}`}
                        onClick={() => onSelectSchool(isActive ? null : school.id)}
                    >
                        <div className="mobile-school-card__header">
                            <span className="mobile-school-card__name">{school.name}</span>
                            <span
                                className={`mobile-school-card__tag ${school.managementType === '公立'
                                        ? 'mobile-school-card__tag--public'
                                        : 'mobile-school-card__tag--private'
                                    }`}
                            >
                                {school.managementType}
                            </span>
                        </div>
                        <div className="mobile-school-card__stats">
                            <span className="mobile-school-card__count">{formatStudents(school.currentStudents)}</span>
                            {school.delta !== 0 ? (
                                <span
                                    className={`mobile-school-card__delta ${isUp ? 'mobile-school-card__delta--up' : isDown ? 'mobile-school-card__delta--down' : ''
                                        }`}
                                >
                                    {formatDelta(school.delta)} ({formatPercent(school.deltaRatio)})
                                </span>
                            ) : null}
                        </div>
                        <div className="mobile-school-card__meta">
                            {school.educationLevel} · {school.countyName} {school.townshipName}
                        </div>
                    </button>
                )
            })}
        </div>
    )
}

export default MobileSchoolCardList
