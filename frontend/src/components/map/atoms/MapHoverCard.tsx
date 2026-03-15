import type { SchoolMapPoint } from '../types'
import { formatStudents } from '../../../lib/analytics'

export function renderSchoolHoverCard(school: SchoolMapPoint) {
  const nameLabel = school.name || '未知學校'
  const studentLabel = school.currentStudents > 0 
    ? `${formatStudents(school.currentStudents).replace(' ', '')}人`
    : '點擊載入人數'
    
  return (
    <div className="atlas-map-hover-card">
      <span className="atlas-map-hover-card__name">{nameLabel}</span>
      <span className="atlas-map-hover-card__stats">{studentLabel}</span>
    </div>
  )
}

export function renderClusterHoverCard(count: number, totalStudents: number) {
  return (
    <div className="atlas-map-hover-card">
      <span className="atlas-map-hover-card__name">{count.toLocaleString('zh-TW')}所學校</span>
      <span className="atlas-map-hover-card__stats"> {formatStudents(totalStudents).replace(' ', '')}人</span>
    </div>
  )
}

export function buildSchoolMarkerAriaLabel(school: SchoolMapPoint) {
    return `${school.name}，${school.townshipName}，${school.educationLevel}，${formatStudents(school.currentStudents)} 人，按 Enter 查看學校分析`
}

export function buildClusterMarkerAriaLabel(count: number, totalStudents: number) {
    return `${count.toLocaleString('zh-TW')} 所學校分群，學生總量 ${formatStudents(totalStudents)} 人，按 Enter 放大地圖`
}
