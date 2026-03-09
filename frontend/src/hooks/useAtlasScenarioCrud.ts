import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import {
  createSavedComparisonScenario,
  downloadCsvFile,
  downloadJsonFile,
  readStoredScenariosFromText,
  writeStoredScenarios,
} from './atlasHelpers'
import { classifyInvestigation } from './buildInvestigationItems'
import type { InvestigationItem, SavedComparisonScenario } from './types'

type ScenarioCrudArgs = {
  favoriteScenarios: SavedComparisonScenario[]
  activeScenarioSnapshot: Omit<SavedComparisonScenario, 'id' | 'updatedAt'> | null
  filteredAnomalies: InvestigationItem[]
  scopeHeadline: string
  favoritesStorageKey: string
  setFavoriteScenarios: Dispatch<SetStateAction<SavedComparisonScenario[]>>
  pushRecentScenario: (countyIds: string[], scenarioName: string) => void
  scenarioFeedback: { show: (message: string) => void }
}

export function useAtlasScenarioCrud({
  favoriteScenarios,
  activeScenarioSnapshot,
  filteredAnomalies,
  scopeHeadline,
  favoritesStorageKey,
  setFavoriteScenarios,
  pushRecentScenario,
  scenarioFeedback,
}: ScenarioCrudArgs) {
  const handleSaveFavoriteScenario = () => {
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
