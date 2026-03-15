
export const ACADEMIC_YEARS = [107, 108, 109, 110, 111, 112, 113, 114] as const
export const EDUCATION_LEVELS = ['全部', '國小', '國中', '高中職', '大專院校'] as const
export const MANAGEMENT_TYPES = ['全部', '公立', '私立'] as const
export const REGION_GROUPS = ['全部', '北部', '中部', '南部', '東部', '離島'] as const

export type AcademicYear = (typeof ACADEMIC_YEARS)[number]
export type EducationLevelFilter = (typeof EDUCATION_LEVELS)[number]
export type SchoolLevel = Exclude<EducationLevelFilter, '全部'>
export type ManagementTypeFilter = (typeof MANAGEMENT_TYPES)[number]
export type SchoolManagementType = Exclude<ManagementTypeFilter, '全部'>
export type RegionGroupFilter = (typeof REGION_GROUPS)[number]
export type RegionGroup = Exclude<RegionGroupFilter, '全部'>

export type SummaryBucketKey = `${EducationLevelFilter}|${ManagementTypeFilter}`

export function buildSummaryBucketKey(
  educationLevel: EducationLevelFilter,
  managementType: ManagementTypeFilter,
): SummaryBucketKey {
  return `${educationLevel}|${managementType}`
}

export type AtlasLoadSource = 'memory' | 'sqlite' | 'network'
