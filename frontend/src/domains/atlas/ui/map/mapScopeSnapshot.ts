import { describeDataStatus, type DataStatus } from '@/shared/lib/analytics'
import type { SchoolMapPoint } from './types'
import type { MapCanvasProps } from './organisms/MapCanvas.types'

export type MapScopeSnapshot = {
  label: string
  students: number | null
  schools: number | null
  delta: number | null
  deltaRatio: number | null
  status: DataStatus
  hasComparison: boolean
}

export function getMapScopeSnapshot(props: MapCanvasProps, selectedSchool: SchoolMapPoint | null): MapScopeSnapshot {
  const summary = props.currentSummary
  const point = props.currentTrend?.find((entry) => entry.year === props.activeYear)
  const schoolPending = Boolean(props.selectedSchoolId && (!selectedSchool || selectedSchool.currentStudents == null || selectedSchool.currentStudents < 0))
  const value = props.selectedSchoolId ? selectedSchool?.currentStudents : point ? summary?.students ?? point.value : null
  const notes = props.summaryDataset?.dataNotes?.filter((note) =>
    props.educationLevel === '全部' || note.message.includes(props.educationLevel),
  )
  const status = describeDataStatus({
    year: props.activeYear,
    value,
    valueStatus: props.selectedSchoolId ? selectedSchool?.valueStatus : undefined,
    notes,
    loading: schoolPending && props.isScopeLoading === true && !props.scopeError,
    error: props.selectedSchoolId ? props.scopeError : null,
  })
  const previous = props.currentTrend?.find((entry) => Number(entry.year) === Number(props.activeYear) - 1)
  const hasComparison = status.hasValue && (props.selectedSchoolId
    ? selectedSchool?.hasComparison === true
    : Boolean(previous && previous.value > 0))
  return {
    label: props.selectedSchoolId ? selectedSchool?.name ?? '學校資料' : props.currentLabel ?? '全台',
    students: status.hasValue ? value ?? null : null,
    schools: props.selectedSchoolId ? null : summary?.schools ?? null,
    delta: hasComparison ? props.selectedSchoolId ? selectedSchool?.delta ?? null : summary?.delta ?? null : null,
    deltaRatio: hasComparison ? props.selectedSchoolId ? selectedSchool?.deltaRatio ?? null : summary?.deltaRatio ?? null : null,
    status,
    hasComparison,
  }
}
