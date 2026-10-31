import type { AcademicYear, EducationLevelFilter, ManagementTypeFilter } from '@/shared/api/data/educationData'
import { formatPercent, type ScopeSummary } from '@/shared/lib/analytics'
import '@/app/styles/molecules/workbench-summary.css'

type WorkbenchSummaryProps = {
  summary: ScopeSummary | null
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
}

export default function WorkbenchSummary({ summary, activeYear, educationLevel, managementType }: WorkbenchSummaryProps) {
  const hasComparison = summary?.trend.some((point) => Number(point.year) === Number(activeYear) - 1) ?? false
  const direction = !hasComparison || !summary?.delta ? 'neutral' : summary.delta > 0 ? 'increase' : 'decrease'
  const changeClass = {
    neutral: 'workbench-summary__change--neutral',
    increase: 'workbench-summary__change--increase',
    decrease: 'workbench-summary__change--decrease',
  }[direction]

  return (
    <section className="workbench-summary" aria-labelledby="workbench-summary-title">
      <p className="workbench-summary__context">
        <span>{activeYear} 學年度</span>
        <span>{educationLevel === '全部' ? '全部學制' : educationLevel} · {managementType === '全部' ? '公私立' : managementType}</span>
      </p>
      <h2 id="workbench-summary-title">全台教育概況</h2>
      <p className="workbench-summary__description">從學生規模與年度變化，探索各地教育版圖。</p>
      <dl className="workbench-summary__metrics">
        <div>
          <dt>學生總人數</dt>
          <dd title={summary ? `${summary.students.toLocaleString('zh-TW')} 人` : undefined}>
            {summary ? (summary.students / 10000).toLocaleString('zh-TW', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : '—'}
            <span>萬人</span>
          </dd>
        </div>
        <div>
          <dt>學校總數</dt>
          <dd>{summary?.schools.toLocaleString('zh-TW') ?? '—'}<span>所</span></dd>
        </div>
        <div>
          <dt>較前一學年度</dt>
          <dd className={`workbench-summary__change ${changeClass}`}>
            {hasComparison && summary ? formatPercent(summary.deltaRatio) : '—'}
          </dd>
        </div>
      </dl>
    </section>
  )
}
