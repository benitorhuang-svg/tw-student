import { useMemo } from 'react'
import type {
  AcademicYear,
  EducationSummaryDataset,
  CountyDetailDataset,
  EducationLevelFilter,
  ManagementTypeFilter,
  RegionGroupFilter,
  SchoolLevel,
} from '@/shared/api/data/educationData'
import type { SchoolMapPoint } from '@/shared/lib/atlas'
import { getSchoolInsights, getStudentsForYear, previousYearOf } from '@/shared/lib/analytics'

export function useSchoolMarkers(
  summaryDataset: EducationSummaryDataset | null,
  countyDetailCache: Record<string, CountyDetailDataset>,
  filters: {
    year: AcademicYear;
    educationLevel: EducationLevelFilter;
    managementType: ManagementTypeFilter;
    region: RegionGroupFilter;
    searchText: string;
  },
  activeCountyId: string | null,
  activeTownshipId: string | null,
  selectedSchoolId: string | null,
  mapZoom: number | null,
) {
  return useMemo(() => {
    if (!summaryDataset) return { schoolMapPoints: [], selectedSchool: null, selectedSchoolInsight: null, schoolInsights: [], countyWideSchoolInsights: [] }

    const cachedDetails = Object.values(countyDetailCache);

    const currentCountyId = Object.keys(countyDetailCache).find(id =>
        countyDetailCache[id].towns.some(t => t.id === activeTownshipId)
    )
    const selectedCountyDetail = currentCountyId ? countyDetailCache[currentCountyId] : null;
    const townshipSchoolInsights = getSchoolInsights(selectedCountyDetail, filters, activeTownshipId);
    const countyWideSchoolInsights = getSchoolInsights(selectedCountyDetail, filters, null);

    const previousYear = previousYearOf(filters.year);

    const points: SchoolMapPoint[] = [];
    const processedIds = new Set<string>();

    for (const detail of cachedDetails) {
      for (const town of detail.towns) {
        for (const s of town.schools) {
          if (filters.educationLevel !== '全部' && s.educationLevel !== filters.educationLevel) continue;
          if (filters.managementType !== '全部' && s.managementType !== filters.managementType) continue;
          if (filters.region !== '全部' && detail.county.region !== filters.region) continue;

          const lat = s.coordinates?.latitude;
          const lon = s.coordinates?.longitude;
          if (!lat || !lon || (lat === 0 && lon === 0)) continue;

          const currentStudents = getStudentsForYear(s, filters.year);
          const previousStudents = previousYear ? getStudentsForYear(s, previousYear) : currentStudents;
          const delta = currentStudents - previousStudents;

          points.push({
            id: s.id,
            name: s.name,
            countyId: detail.county.id,
            townshipId: town.id,
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

    const shouldReadSummarySchoolIndex = Boolean(selectedSchoolId || activeCountyId || (mapZoom ?? 7) >= 12)
    if (shouldReadSummarySchoolIndex && summaryDataset.schoolCodeIndex) {
      for (const [code, entry] of Object.entries(summaryDataset.schoolCodeIndex)) {
        const id = entry.schoolIds?.[0] || code;
        if (processedIds.has(id)) continue;
        if (activeCountyId && entry.countyId !== activeCountyId && entry.countyCode !== activeCountyId) continue;
        if (!activeCountyId && selectedSchoolId && id !== selectedSchoolId && code !== selectedSchoolId && !entry.schoolIds?.includes(selectedSchoolId)) continue;

        if (entry.longitude && entry.latitude) {
          if (filters.educationLevel !== '全部' && !entry.levels?.includes(filters.educationLevel as SchoolLevel)) continue;

          points.push({
            id,
            name: entry.name,
            countyId: entry.countyId,
            townshipId: entry.townshipId,
            townshipName: entry.townshipName ?? '',
            educationLevel: entry.levels?.[0] ?? '',
            managementType: '未知',
            status: '正常',
            currentStudents: -1,
            delta: 0,
            deltaRatio: 0,
            latitude: entry.latitude,
            longitude: entry.longitude,
          });
        }
      }
    }

    const selectedSchool = selectedSchoolId ? points.find(p => p.id === selectedSchoolId) ?? null : null;
    const selectedSchoolInsight = selectedSchoolId ? (townshipSchoolInsights.find(s => s.id === selectedSchoolId) ?? countyWideSchoolInsights.find(s => s.id === selectedSchoolId) ?? null) : null;

    return {
      schoolMapPoints: points,
      selectedSchool,
      selectedSchoolInsight,
      schoolInsights: townshipSchoolInsights,
      countyWideSchoolInsights,
    };
  }, [summaryDataset, countyDetailCache, filters, activeCountyId, activeTownshipId, selectedSchoolId, mapZoom]);
}
