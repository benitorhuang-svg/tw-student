import type { AtlasTab } from '@/shared/lib/atlas'

export function buildDesktopTabItems(
  selectedCounty: { shortLabel: string } | null,
  selectedTownshipSummary: { label: string } | null,
  selectedSchool: { name: string } | null,
): Array<{ key: AtlasTab; label: string }> {
  return [
    { key: 'overview', label: '概況總覽' },
    { key: 'county', label: `縣市分析${selectedCounty ? `_${selectedCounty.shortLabel}` : ''}` },
    { key: 'schools', label: `鄉鎮分析${selectedTownshipSummary ? `_${selectedTownshipSummary.label}` : ''}` },
    { key: 'school-focus', label: `校別概況${selectedSchool ? `_${selectedSchool.name}` : ''}` },
  ]
}
