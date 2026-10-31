import type { CountyDetailDataset } from '@/shared/api/data/educationData'
import type { DashboardFilters, SchoolInsight } from '@/shared/lib/analytics/analytics.types'
import { getStudentsForYear, matchesSchoolFilters, previousYearOf } from '@/shared/lib/analytics/analytics.helpers'
import { getYearValueStatus } from '../dataStatus'

export function getSchoolInsights(
  countyDetail: CountyDetailDataset | null,
  filters: DashboardFilters,
  townshipId: string | null,
): SchoolInsight[] {
  if (!countyDetail) {
    return []
  }

  return countyDetail.towns
    .filter((township) => (townshipId ? township.id === townshipId : true))
    .flatMap((township) =>
      township.schools
        .filter((school) => matchesSchoolFilters(school, filters, countyDetail.county.name, township.name))
        .map((school) => {
          const currentStudents = getStudentsForYear(school, filters.year)
          const currentRecord = school.yearlyStudents.find((record) => record.year === filters.year)
          const previousYear = previousYearOf(filters.year)
          const previousStudents = previousYear ? getStudentsForYear(school, previousYear) : currentStudents
          const previousRecord = school.yearlyStudents.find((record) => record.year === previousYear)
          const delta = currentStudents - previousStudents

          return {
            id: school.id,
            code: school.code,
            name: school.name,
            countyName: countyDetail.county.name,
            townshipId: township.id,
            townshipName: township.name,
            educationLevel: school.educationLevel,
            managementType: school.managementType,
            address: school.address,
            phone: school.phone,
            website: school.website,
            currentStudents,
            valueStatus: getYearValueStatus(currentRecord, school.missingYears?.includes(filters.year)),
            hasComparison: Boolean(previousRecord && !school.missingYears?.includes(previousRecord.year) && !['missing', 'year-not-applicable'].includes(getYearValueStatus(previousRecord) ?? '') && previousStudents > 0),
            delta,
            deltaRatio: previousStudents === 0 ? 0 : delta / previousStudents,
            trend: school.yearlyStudents.map((record) => ({ year: record.year, value: record.students, valueStatus: getYearValueStatus(record, school.missingYears?.includes(record.year)) })),
            studentCompositions: school.studentCompositions,
            status: school.status,
            missingYears: school.missingYears,
            dataNotes: school.dataNotes,
            // Semi-realistic mock values for demo
            studentTeacherRatio: 12 + (parseInt(school.code.slice(-2)) % 8),
            averageClassSize: 22 + (parseInt(school.code.slice(-3)) % 12),
          }
        }),
    )
    .sort((left, right) => right.currentStudents - left.currentStudents)
}
