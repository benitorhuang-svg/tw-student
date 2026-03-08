import { type ChangeEvent, type Dispatch, type SetStateAction, type TransitionStartFunction } from 'react'
import {
  EDUCATION_LEVELS,
  MANAGEMENT_TYPES,
  REGION_GROUPS,
  type AcademicYear,
  type EducationLevelFilter,
  type ManagementTypeFilter,
  type RegionGroupFilter,
  type EducationSummaryDataset,
} from '../data/educationData'
import {
  createSavedComparisonScenario,
  downloadCsvFile,
  downloadJsonFile,
  readStoredScenariosFromText,
  writeStoredScenarios,
} from './atlasHelpers'
import { classifyInvestigation } from './buildInvestigationItems'
import type { InvestigationItem, SavedComparisonScenario } from './types'
import { DEFAULT_YEAR, type AtlasTab } from './useAtlasQueryState'

type FeedbackController = { message: string | null; show: (message: string) => void }

type ScenarioActionsArgs = {
  summaryDataset: EducationSummaryDataset | null
  activeYear: AcademicYear
  educationLevel: EducationLevelFilter
  managementType: ManagementTypeFilter
  region: RegionGroupFilter
  comparisonScenarioName: string
  comparisonCountyIds?: string[]
  favoriteScenarios: SavedComparisonScenario[]
  activeScenarioSnapshot: Omit<SavedComparisonScenario, 'id' | 'updatedAt'> | null
  filteredAnomalies: InvestigationItem[]
  scopeHeadline: string
  favoritesStorageKey: string
  recentsStorageKey: string
  setFavoriteScenarios: Dispatch<SetStateAction<SavedComparisonScenario[]>>
  setRecentScenarios: Dispatch<SetStateAction<SavedComparisonScenario[]>>
  setComparisonCountyIds: Dispatch<SetStateAction<string[]>>
  setComparisonScenarioName: Dispatch<SetStateAction<string>>
  setActiveYear: Dispatch<SetStateAction<AcademicYear>>
  setEducationLevel: Dispatch<SetStateAction<EducationLevelFilter>>
  setManagementType: Dispatch<SetStateAction<ManagementTypeFilter>>
  setRegion: Dispatch<SetStateAction<RegionGroupFilter>>
  setSelectedCountyId: Dispatch<SetStateAction<string | null>>
  setSelectedTownshipId: Dispatch<SetStateAction<string | null>>
  setSelectedSchoolId: Dispatch<SetStateAction<string | null>>
  setMapResetToken: Dispatch<SetStateAction<number>>
  setActiveTab: (tab: AtlasTab, scrollTop?: number) => void
  clearCountyDetailError: () => void
  startTransition: TransitionStartFunction
  copyFeedback: FeedbackController
  scenarioFeedback: FeedbackController
}

export function useAtlasScenarioActions({
  summaryDataset,
  activeYear,
  educationLevel,
  managementType,
  region,
  comparisonScenarioName,
  favoriteScenarios,
  activeScenarioSnapshot,
  filteredAnomalies,
  scopeHeadline,
  favoritesStorageKey,
  recentsStorageKey,
  setFavoriteScenarios,
  setRecentScenarios,
  setComparisonCountyIds,
  setComparisonScenarioName,
  setActiveYear,
  setEducationLevel,
  setManagementType,
  setRegion,
  setSelectedCountyId,
  setSelectedTownshipId,
  setSelectedSchoolId,
  setMapResetToken,
  setActiveTab,
  clearCountyDetailError,
  startTransition,
  copyFeedback,
  scenarioFeedback,
}: ScenarioActionsArgs) {
  const pushRecentScenario = (countyIds: string[], scenarioName: string) => {
    if (!summaryDataset) return
    const snapshot = createSavedComparisonScenario({
      name: scenarioName.trim() || `比較 ${countyIds.length} 縣市`,
      countyIds: countyIds.filter((countyId) => summaryDataset.counties.some((county) => county.id === countyId)).slice(0, 4),
      activeYear,
      educationLevel,
      managementType,
      region,
    })
    if (snapshot.countyIds.length === 0) return

    setRecentScenarios((current) => {
      const next = [snapshot, ...current.filter((scenario) => scenario.id !== snapshot.id)].slice(0, 6)
      writeStoredScenarios(recentsStorageKey, next)
      return next
    })
  }

  const handleCountySelect = (countyId: string) => {
    startTransition(() => {
      setSelectedCountyId(countyId)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      clearCountyDetailError()
    })
  }

  const handleTownshipSelect = (townshipId: string) => {
    startTransition(() => {
      setSelectedTownshipId(townshipId)
      setSelectedSchoolId(null)
    })
  }

  const handleResetScope = () => {
    startTransition(() => {
      setSelectedCountyId(null)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
      clearCountyDetailError()
      setMapResetToken((current) => current + 1)
    })
    setActiveTab('overview', 0)
  }

  const toggleComparisonCounty = (countyId: string) => {
    setComparisonCountyIds((current) => {
      if (current.includes(countyId)) {
        const next = current.filter((id) => id !== countyId)
        pushRecentScenario(next, comparisonScenarioName)
        return next.length > 0 ? next : current
      }

      const next = [countyId, ...current].slice(0, 4)
      pushRecentScenario(next, comparisonScenarioName)
      return next
    })
  }

  const handleCopyComparisonLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      copyFeedback.show('比較情境連結已複製')
    } catch {
      copyFeedback.show('無法直接複製，請手動複製網址')
    }
  }

  const applySavedScenario = (scenario: SavedComparisonScenario) => {
    if (!summaryDataset) return
    pushRecentScenario(scenario.countyIds, scenario.name)
    startTransition(() => {
      setComparisonScenarioName(scenario.name)
      setComparisonCountyIds(scenario.countyIds.filter((countyId) => summaryDataset.counties.some((county) => county.id === countyId)).slice(0, 4))
      setActiveYear(summaryDataset.years.includes(scenario.activeYear) ? scenario.activeYear : (summaryDataset.years.at(-1) ?? DEFAULT_YEAR))
      setEducationLevel(EDUCATION_LEVELS.includes(scenario.educationLevel) ? scenario.educationLevel : '全部')
      setManagementType(MANAGEMENT_TYPES.includes(scenario.managementType) ? scenario.managementType : '全部')
      setRegion(REGION_GROUPS.includes(scenario.region) ? scenario.region : '全部')
      setSelectedCountyId(null)
      setSelectedTownshipId(null)
      setSelectedSchoolId(null)
    })
    scenarioFeedback.show(`已套用情境：${scenario.name}`)
  }

  const handleSaveFavoriteScenario = () => {
    if (!summaryDataset) return
    if (!activeScenarioSnapshot) {
      scenarioFeedback.show('目前沒有可收藏的比較情境')
      return
    }

    const savedScenario = createSavedComparisonScenario(activeScenarioSnapshot)
    pushRecentScenario(savedScenario.countyIds, savedScenario.name)
    setFavoriteScenarios((current) => {
      const next = [savedScenario, ...current.filter((scenario) => scenario.id !== savedScenario.id)].slice(0, 8)
      writeStoredScenarios(favoritesStorageKey, next)
      return next
    })
    scenarioFeedback.show(`已收藏情境：${savedScenario.name}`)
  }

  const handleRemoveFavoriteScenario = (scenarioId: string) => {
    setFavoriteScenarios((current) => {
      const next = current.filter((scenario) => scenario.id !== scenarioId)
      writeStoredScenarios(favoritesStorageKey, next)
      return next
    })
  }

  const handleRenameFavoriteScenario = (scenarioId: string) => {
    const nextName = window.prompt('輸入新的情境名稱')?.trim()
    if (!nextName) return

    setFavoriteScenarios((current) => {
      const next = current.map((scenario) =>
        scenario.id !== scenarioId
          ? scenario
          : createSavedComparisonScenario({
              name: nextName,
              countyIds: scenario.countyIds,
              activeYear: scenario.activeYear,
              educationLevel: scenario.educationLevel,
              managementType: scenario.managementType,
              region: scenario.region,
              pinned: scenario.pinned,
            }),
      )
      writeStoredScenarios(favoritesStorageKey, next)
      return next
    })
    scenarioFeedback.show(`已重新命名情境：${nextName}`)
  }

  const handleTogglePinScenario = (scenarioId: string) => {
    setFavoriteScenarios((current) => {
      const next = current
        .map((scenario) => scenario.id === scenarioId ? { ...scenario, pinned: !scenario.pinned, updatedAt: new Date().toISOString() } : scenario)
        .sort((left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)))
      writeStoredScenarios(favoritesStorageKey, next)
      return next
    })
  }

  const handleExportFavoriteScenarios = () => {
    if (favoriteScenarios.length === 0) {
      scenarioFeedback.show('目前沒有可匯出的收藏情境')
      return
    }

    downloadJsonFile('atlas-comparison-scenarios.json', favoriteScenarios)
    scenarioFeedback.show('已匯出收藏情境 JSON')
  }

  const handleImportFavoriteScenarios = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const imported = readStoredScenariosFromText(text)
      if (imported.length === 0) {
        scenarioFeedback.show('匯入檔案沒有有效情境')
        return
      }

      setFavoriteScenarios((current) => {
        const scenarioMap = new Map<string, SavedComparisonScenario>()
        ;[...imported, ...current].forEach((scenario) => {
          if (!scenarioMap.has(scenario.id)) scenarioMap.set(scenario.id, scenario)
        })

        const next = [...scenarioMap.values()].sort((left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned))).slice(0, 16)
        writeStoredScenarios(favoritesStorageKey, next)
        return next
      })
      scenarioFeedback.show(`已匯入 ${imported.length} 筆情境`)
    } catch {
      scenarioFeedback.show('無法解析情境 JSON')
    }
  }

  const handleDownloadInvestigation = (item: InvestigationItem) => {
    const hasSchools = item.seriesRows.some((row) => row.schools != null)
    const hasFlags = item.seriesRows.some((row) => (row.flags?.length ?? 0) > 0)
    const header = ['year', 'students', ...(hasSchools ? ['schools'] : []), ...(hasFlags ? ['flags'] : [])]
    const rows = item.seriesRows.map((row) => [
      String(row.year),
      String(row.students),
      ...(hasSchools ? [String(row.schools ?? '')] : []),
      ...(hasFlags ? [row.flags?.join('|') ?? ''] : []),
    ])
    downloadCsvFile(item.downloadName, [header, ...rows])
  }

  const handleDownloadAllInvestigations = () => {
    if (filteredAnomalies.length === 0) {
      scenarioFeedback.show('目前沒有可匯出的異常序列')
      return
    }

    const rows = filteredAnomalies.flatMap((item) =>
      item.seriesRows.map((row) => [item.scope, item.title, classifyInvestigation(item), item.severity, item.meta, String(row.year), String(row.students), String(row.schools ?? ''), row.flags?.join('|') ?? '']),
    )
    downloadCsvFile(`${scopeHeadline}-異常序列整批匯出.csv`, [
      ['scope', 'title', 'filter', 'severity', 'meta', 'year', 'students', 'schools', 'flags'],
      ...rows,
    ])
  }

  const favoriteScenarioIds = new Set(favoriteScenarios.map((scenario) => scenario.id))

  return {
    handleCountySelect,
    handleTownshipSelect,
    handleResetScope,
    toggleComparisonCounty,
    handleCopyComparisonLink,
    applySavedScenario,
    handleSaveFavoriteScenario,
    handleRemoveFavoriteScenario,
    handleRenameFavoriteScenario,
    handleTogglePinScenario,
    handleExportFavoriteScenarios,
    handleImportFavoriteScenarios,
    handleDownloadInvestigation,
    handleDownloadAllInvestigations,
    favoriteScenarioIds,
  }
}