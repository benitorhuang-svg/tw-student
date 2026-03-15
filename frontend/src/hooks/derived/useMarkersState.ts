import { useMemo } from 'react'
import type { 
  AcademicYear,
  EducationSummaryDataset, 
  CountyBucketDataset,
  CountyDetailDataset,
  EducationLevelFilter,
  ManagementTypeFilter,
  RegionGroupFilter,
} from '../../data/educationData'
import type { SchoolMapPoint } from '../../components/map/types'
import { getSchoolInsights } from '../../lib/analytics'

export function useMarkersState(
  summaryDataset: EducationSummaryDataset | null,
  countyDetailCache: Record<string, CountyDetailDataset>,
  filters: { 
    year: AcademicYear;
    educationLevel: EducationLevelFilter; 
    managementType: ManagementTypeFilter;
    region: RegionGroupFilter;
    searchText: string;
  },
  activeTownshipId: string | null,
  selectedSchoolId: string | null,
  countyBucketCache: Record<string, CountyBucketDataset>,
) {
  return useMemo(() => {
    if (!summaryDataset) return { schoolMapPoints: [], selectedSchool: null, schoolInsights: [], countyWideSchoolInsights: [] }

    // Merge schools from all cached counties to ensure seamless styling across borders
    const allCachedInsights = Object.values(countyDetailCache).flatMap(detail => 
        getSchoolInsights(detail, filters, null)
    )
    
    // We still maintain these for specific panel UI, but for map points we want everything in cache
    const currentCountyId = Object.keys(countyDetailCache).find(id => 
        countyDetailCache[id].towns.some(t => t.id === activeTownshipId)
    )
    const selectedCountyDetail = currentCountyId ? countyDetailCache[currentCountyId] : null
    const townshipSchoolInsights = getSchoolInsights(selectedCountyDetail, filters, activeTownshipId)
    const countyWideSchoolInsights = getSchoolInsights(selectedCountyDetail, filters, null)
    
    const activeSchoolId = allCachedInsights.some((s) => s.id === selectedSchoolId) ? selectedSchoolId : null
    const selectedSchool = activeSchoolId 
      ? allCachedInsights.find((s) => s.id === activeSchoolId) ?? null 
      : null

    // Build a lookup for student counts from the bucket cache for schools not in detail cache
    const bucketStudentLookup = new Map<string, number>()
    Object.values(countyBucketCache).forEach((bucketData: CountyBucketDataset) => {
      Object.values(bucketData.precisions).forEach((buckets) => {
        buckets.forEach((bucket) => {
          bucket.topSchools?.forEach((s) => {
            if (!bucketStudentLookup.has(s.id)) {
              bucketStudentLookup.set(s.id, s.students)
            }
          })
        })
      })
    })

    const schoolRecordLookup = new Map<string, any>()
    Object.values(countyDetailCache).forEach(detail => {
        detail.towns.forEach(town => {
            town.schools.forEach(s => schoolRecordLookup.set(s.id, s))
        })
    })

    const points: SchoolMapPoint[] = allCachedInsights.reduce<SchoolMapPoint[]>((acc, school) => {
      const raw = schoolRecordLookup.get(school.id)
      if (!raw) return acc
      const { latitude, longitude } = raw.coordinates
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) return acc
      
      acc.push({
        id: school.id,
        name: school.name,
        townshipName: school.townshipName,
        educationLevel: school.educationLevel,
        managementType: school.managementType,
        status: school.status ?? '正常',
        currentStudents: school.currentStudents,
        delta: school.delta,
        deltaRatio: school.deltaRatio,
        latitude,
        longitude,
        website: raw.profileUrl ?? raw.website,
      })
      return acc
    }, [])

    // ============================================================================
    // Fix for "Zoom 12 顯示所有校點"
    // We add "preview" points from the schoolCodeIndex for all schools NOT already
    // in the detailed points. This ensures that even without a focused county, 
    // or when looking at borders, all school markers appear at high zoom.
    // ============================================================================
    if (summaryDataset.schoolCodeIndex) {
      const existingIds = new Set(points.map(p => p.id))
      
      Object.entries(summaryDataset.schoolCodeIndex).forEach(([code, entry]) => {
        // We use the first schoolId as a representative if multiple exist for the same code
        const id = entry.schoolIds?.[0] || code
        
        // Skip if already in the detailed points
        if (existingIds.has(id)) return

        if (entry.longitude && entry.latitude) {
          // Filter by education level if applicable
          if (filters.educationLevel !== '全部' && !entry.levels?.includes(filters.educationLevel as any)) {
              return
          }

          points.push({
            id,
            name: entry.name,
            townshipName: entry.townshipName ?? '',
            educationLevel: entry.levels?.[0] ?? '',
            managementType: '未知', 
            status: '正常',
            currentStudents: bucketStudentLookup.get(id) ?? -1, 
            delta: 0,
            deltaRatio: 0,
            latitude: entry.latitude,
            longitude: entry.longitude,
          })
        }
      })
    }

    return {
      schoolMapPoints: points,
      selectedSchool,
      schoolInsights: townshipSchoolInsights,
      countyWideSchoolInsights,
    }
  }, [summaryDataset, countyDetailCache, countyBucketCache, filters, activeTownshipId, selectedSchoolId])
}
