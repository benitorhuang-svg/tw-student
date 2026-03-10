import type { CountyDetailDataset } from '../data/educationData'
import type { DashboardFilters, SchoolInsight } from './analytics.types'
import { getStudentsForYear, matchesSchoolFilters, previousYearOf } from './analytics.helpers'

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
          const previousYear = previousYearOf(filters.year)
          const previousStudents = previousYear ? getStudentsForYear(school, previousYear) : currentStudents
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
            delta,
            deltaRatio: previousStudents === 0 ? 0 : delta / previousStudents,
            trend: school.yearlyStudents.map((record) => ({ year: record.year, value: record.students })),
            studentCompositions: school.studentCompositions,
            status: school.status,
            missingYears: school.missingYears,
            dataNotes: school.dataNotes,
          }
        }),
    )
    .sort((left, right) => right.currentStudents - left.currentStudents)
}