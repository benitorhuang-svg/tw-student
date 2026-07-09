import type { ReactNode, TransitionStartFunction } from 'react'

import type {
  AcademicYear,
  CountyBoundaryCollection,
  CountyBucketDataset,
  EducationLevelFilter,
  EducationSummaryDataset,
  ManagementTypeFilter,
  RegionGroupFilter,
  TownshipBoundaryCollection,
} from '@/shared/api/data/educationData'
import type { AtlasTab } from '@/shared/lib/atlas'
import type { CountySummary, RankingSummary } from '@/shared/lib/analytics'

import type { SchoolMapPoint } from '../types'

export type MapFilterSlotOptions = {
  hideIcon?: boolean
}

export type MapCanvasProps = {
  counties: CountySummary[]
  activeRegion: RegionGroupFilter
  activeCountyId: string | null
  activeTownshipId: string | null
  theme: 'light' | 'dark'
  countyBoundaries: CountyBoundaryCollection
  townshipBoundaries: TownshipBoundaryCollection | null
  townshipRows: RankingSummary[]
  allTownshipRows: RankingSummary[]
  allTownshipBoundaries: TownshipBoundaryCollection | null
  schoolPoints: SchoolMapPoint[]
  countyBuckets: CountyBucketDataset | null
  selectedSchoolId: string | null
  highlightedCountyId?: string | null
  highlightedTownshipId?: string | null
  highlightedSchoolId?: string | null
  isTownshipBoundaryLoading: boolean
  mapResetToken: number
  onSelectCounty: (countyId: string, options?: { skipTabSwitch?: boolean }) => void
  onSelectTownship: (townshipId: string, options?: { skipTabSwitch?: boolean }) => void
  onSelectSchool: (schoolId: string | null) => void
  onHoverCounty?: (countyId: string | null) => void
  onZoomChange?: (zoom: number) => void
  onMoveEnd?: (lat: number, lon: number) => void
  currentMapZoom?: number | null
  initialMapZoom?: number | null
  initialMapLat?: number | null
  initialMapLon?: number | null
  scopePath: string[]
  onNavigateScope: (depth: number) => void
  vectorTileBaseUrl?: string
  onVectorTileError?: () => void
  forceTownshipLabels?: boolean
  activeTab: AtlasTab
  activeYear: AcademicYear
  summaryYears: AcademicYear[]
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  onSetRegion: (region: RegionGroupFilter) => void
  onResetRegion: () => void
  onSetActiveYear: (year: AcademicYear) => void
  onStopPlayback: () => void
  onTogglePlayback: () => void
  onSetEducationLevel: (level: EducationLevelFilter) => void
  onSetManagementType: (type: ManagementTypeFilter) => void
  isYearPlaybackActive: boolean
  startTransition: TransitionStartFunction
  activeCountyName: string | null
  summaryDataset?: EducationSummaryDataset | null
  currentTrend?: Array<{ year: AcademicYear; value: number }>
  currentLabel?: string
  currentLevel?: string
  renderManagementTypeFilter?: (options?: MapFilterSlotOptions) => ReactNode
  renderEducationLevelFilter?: (options?: MapFilterSlotOptions) => ReactNode
}
