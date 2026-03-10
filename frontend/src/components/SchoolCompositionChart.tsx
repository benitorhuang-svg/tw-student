import { useMemo } from 'react'

import type { SchoolCodeAtlasEntry, StudentBandRecord, StudentCompositionRecord } from '../data/educationData'
import type { AcademicYear } from '../hooks/types'
import { formatAcademicYear, formatStudents, type SchoolInsight } from '../lib/analytics'

type SchoolCompositionChartProps = {
  schoolAtlasEntry: SchoolCodeAtlasEntry | null
  selectedSchool: SchoolInsight
  activeYear: AcademicYear
  isLoading?: boolean
  loadError?: string | null
}

const LEVEL_ORDER = new Map([['國小', 1], ['國中', 2], ['高中職', 3], ['大專院校', 4]])

function sortBands(left: StudentBandRecord, right: StudentBandRecord) {
  if (left.totalStudents !== right.totalStudents) {
    return right.totalStudents - left.totalStudents
  }

  return left.label.localeCompare(right.label, 'zh-Hant')
}

function pickComposition(compositions: StudentCompositionRecord[], activeYear: AcademicYear) {
  return compositions.find((record) => record.year === activeYear)
    ?? [...compositions].reverse().find((record) => record.totalStudents > 0)
    ?? compositions.at(-1)
    ?? null
}

function inferGenderTotal(composition: StudentCompositionRecord | null, key: 'maleStudents' | 'femaleStudents') {
  if (!composition) return undefined
  if (typeof composition[key] === 'number') return composition[key]

  const total = composition.bands.reduce((sum, band) => sum + (band[key] ?? 0), 0)
  return total > 0 ? total : undefined
}

function SchoolCompositionChart({ schoolAtlasEntry, selectedSchool, activeYear, isLoading = false, loadError = null }: SchoolCompositionChartProps) {
  const levelRows = useMemo(() => {
    if (!schoolAtlasEntry) return []

    return [...schoolAtlasEntry.levels]
      .sort((left, right) => {
        const leftOrder = LEVEL_ORDER.get(left.educationLevel) ?? 99
        const rightOrder = LEVEL_ORDER.get(right.educationLevel) ?? 99
        if (leftOrder !== rightOrder) return leftOrder - rightOrder
        return left.name.localeCompare(right.name, 'zh-Hant')
      })
      .map((level) => {
        const composition = pickComposition(level.studentCompositions, activeYear)
        const totalStudents = composition?.totalStudents
          ?? level.yearlyStudents.find((record) => record.year === activeYear)?.students
          ?? level.yearlyStudents.at(-1)?.students
          ?? 0

        return {
          ...level,
          bands: [...(composition?.bands ?? [])].sort(sortBands),
          composition,
          totalStudents,
          maleStudents: inferGenderTotal(composition, 'maleStudents'),
          femaleStudents: inferGenderTotal(composition, 'femaleStudents'),
          displayYear: composition?.year ?? level.yearlyStudents.at(-1)?.year ?? activeYear,
          isSelectedLevel: level.schoolId === selectedSchool.id || level.educationLevel === selectedSchool.educationLevel,
        }
      })
  }, [activeYear, schoolAtlasEntry, selectedSchool.educationLevel, selectedSchool.id])

  const maxBandStudents = useMemo(() => {
    const maxValue = levelRows.flatMap((level) => level.bands).reduce((max, band) => Math.max(max, band.totalStudents), 0)
    return Math.max(maxValue, 1)
  }, [levelRows])

  const totalByCode = levelRows.reduce((sum, level) => sum + level.totalStudents, 0)

  return (
    <section className="school-composition-chart">
      <div className="school-composition-chart__header">
        <div>
          <p className="eyebrow" style={{ color: 'var(--palette-cyan)' }}>校代碼完整結構</p>
          <h3>{selectedSchool.code} 全學制 / 年級 / 男女結構</h3>
        </div>
        <p className="panel-heading__meta">
          同一校代碼下若含多個學制，這裡會一起呈現。
          {levelRows.length > 0 ? ` ${formatAcademicYear(activeYear)} 合計 ${formatStudents(totalByCode)} 人。` : ''}
        </p>
      </div>

      {isLoading ? <div className="empty-state">正在載入同校代碼的學制切片資料...</div> : null}
      {!isLoading && loadError ? <div className="empty-state">{loadError}</div> : null}
      {!isLoading && !loadError && levelRows.length === 0 ? <div className="empty-state">目前沒有可顯示的校代碼結構資料。</div> : null}

      {!isLoading && !loadError && levelRows.length > 0 ? (
        <div className="school-composition-chart__levels">
          {levelRows.map((level) => {
            const genderTotal = (level.maleStudents ?? 0) + (level.femaleStudents ?? 0)
            const maleShare = genderTotal > 0 ? ((level.maleStudents ?? 0) / genderTotal) * 100 : 0
            const femaleShare = genderTotal > 0 ? ((level.femaleStudents ?? 0) / genderTotal) * 100 : 0

            return (
              <article key={`${level.schoolId}-${level.educationLevel}`} className={level.isSelectedLevel ? 'school-composition-chart__level school-composition-chart__level--active' : 'school-composition-chart__level'}>
                <div className="school-composition-chart__level-header">
                  <div>
                    <span className="school-composition-chart__level-tag">{level.managementType}{level.educationLevel}</span>
                    <strong>{level.name}</strong>
                    <small>{level.townshipName} / {level.displayYear === activeYear ? formatAcademicYear(activeYear) : `${formatAcademicYear(level.displayYear)}（最近有資料）`}</small>
                  </div>
                  <div className="school-composition-chart__level-total">
                    <strong>{formatStudents(level.totalStudents)} 人</strong>
                    <small>{level.isSelectedLevel ? '目前聚焦學制' : '同校代碼其他學制'}</small>
                  </div>
                </div>

                {genderTotal > 0 ? (
                  <div className="school-composition-chart__gender-block">
                    <div className="school-composition-chart__gender-bar" aria-hidden="true">
                      <span className="school-composition-chart__gender-segment school-composition-chart__gender-segment--male" style={{ width: `${maleShare}%` }} />
                      <span className="school-composition-chart__gender-segment school-composition-chart__gender-segment--female" style={{ width: `${femaleShare}%` }} />
                    </div>
                    <div className="school-composition-chart__gender-meta">
                      <span>男 {formatStudents(level.maleStudents ?? 0)} 人</span>
                      <span>女 {formatStudents(level.femaleStudents ?? 0)} 人</span>
                    </div>
                  </div>
                ) : (
                  <div className="school-composition-chart__gender-meta school-composition-chart__gender-meta--empty">此學制未提供男女拆分。</div>
                )}

                {level.bands.length > 0 ? (
                  <div className="school-composition-chart__bands">
                    {level.bands.map((band) => {
                      const width = `${(band.totalStudents / maxBandStudents) * 100}%`
                      const bandGenderTotal = (band.maleStudents ?? 0) + (band.femaleStudents ?? 0)
                      const bandMaleShare = bandGenderTotal > 0 ? ((band.maleStudents ?? 0) / bandGenderTotal) * 100 : 0
                      const bandFemaleShare = bandGenderTotal > 0 ? ((band.femaleStudents ?? 0) / bandGenderTotal) * 100 : 0

                      return (
                        <div key={`${level.schoolId}-${band.category}-${band.id}`} className="school-composition-chart__band-row">
                          <div className="school-composition-chart__band-label">
                            <span>{band.label}</span>
                            <strong>{formatStudents(band.totalStudents)} 人</strong>
                          </div>
                          <div className="school-composition-chart__band-rail">
                            <div className="school-composition-chart__band-fill" style={{ width }}>
                              {bandGenderTotal > 0 ? (
                                <>
                                  <span className="school-composition-chart__gender-segment school-composition-chart__gender-segment--male" style={{ width: `${bandMaleShare}%` }} />
                                  <span className="school-composition-chart__gender-segment school-composition-chart__gender-segment--female" style={{ width: `${bandFemaleShare}%` }} />
                                </>
                              ) : (
                                <span className="school-composition-chart__band-fill-solid" />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="school-composition-chart__gender-meta school-composition-chart__gender-meta--empty">此學制目前只有總量，沒有更細的年級或學位帶拆分。</div>
                )}
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

export default SchoolCompositionChart