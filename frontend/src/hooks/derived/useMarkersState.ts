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
import { getStudentsForYear, previousYearOf } from '../../lib/analytics.helpers'

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

    // PERFORMANCE OPTIMIZATION: Zero-copy projection where possible
    // We avoid repeated massive flatMaps by using a more targeted extraction logic.
    const cachedDetails = Object.values(countyDetailCache);
    
    // We still need full insights for the specific sidebar panels (township/county)
    const currentCountyId = Object.keys(countyDetailCache).find(id => 
        countyDetailCache[id].towns.some(t => t.id === activeTownshipId)
    )
    const selectedCountyDetail = currentCountyId ? countyDetailCache[currentCountyId] : null;
    const townshipSchoolInsights = getSchoolInsights(selectedCountyDetail, filters, activeTownshipId);
    const countyWideSchoolInsights = getSchoolInsights(selectedCountyDetail, filters, null);
    
    // Build a lookup for student counts from the bucket cache to enrich preview points
    const bucketStudentLookup = new Map<string, number>();
    for (const bucketData of Object.values(countyBucketCache)) {
      for (const buckets of Object.values(bucketData.precisions)) {
        for (const bucket of buckets) {
          if (!bucket.topSchools) continue;
          for (const s of bucket.topSchools) {
            if (!bucketStudentLookup.has(s.id)) {
              bucketStudentLookup.set(s.id, s.students);
            }
          }
        }
      }
    }

    const points: SchoolMapPoint[] = [];
    const processedIds = new Set<string>();

    // 1. Process Detailed Schools (Highest priority, most accurate data)
    for (const detail of cachedDetails) {
      for (const town of detail.towns) {
        for (const s of town.schools) {
          // Fast filter skip
          if (filters.educationLevel !== '全部' && s.educationLevel !== filters.educationLevel) continue;
          if (filters.managementType !== '全部' && s.managementType !== filters.managementType) continue;
          if (filters.region !== '全部' && detail.county.region !== filters.region) continue;

          const lat = s.coordinates?.latitude;
          const lon = s.coordinates?.longitude;
          if (!lat || !lon || (lat === 0 && lon === 0)) continue;

          const currentStudents = getStudentsForYear(s, filters.year);
          const previousYear = previousYearOf(filters.year);
          const previousStudents = previousYear ? getStudentsForYear(s, previousYear) : currentStudents;
          const delta = currentStudents - previousStudents;

          points.push({
            id: s.id,
            name: s.name,
            townshipName: town.name,
            educationLevel: s.educationLevel,
            managementType: s.managementType,
            status: s.status ?? '正常',
            currentStudents,
            delta,
            deltaRatio: previousStudents === 0 ? 0 : delta / previousStudents,
            latitude: lat,
            longitude: lon,
            website: s.profileUrl ?? s.website,
          });
          processedIds.add(s.id);
        }
      }
    }

    // 2. Process Preview Schools (From global index)
    if (summaryDataset.schoolCodeIndex) {
      for (const [code, entry] of Object.entries(summaryDataset.schoolCodeIndex)) {
        const id = entry.schoolIds?.[0] || code;
        if (processedIds.has(id)) continue;

        if (entry.longitude && entry.latitude) {
          if (filters.educationLevel !== '全部' && !entry.levels?.includes(filters.educationLevel as any)) continue;

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
          });
        }
      }
    }

    const selectedSchool = selectedSchoolId ? points.find(p => p.id === selectedSchoolId) ?? null : null;

    return {
      schoolMapPoints: points,
      selectedSchool,
      schoolInsights: townshipSchoolInsights,
      countyWideSchoolInsights,
    };
  }, [summaryDataset, countyDetailCache, countyBucketCache, filters, activeTownshipId, selectedSchoolId]);
}
