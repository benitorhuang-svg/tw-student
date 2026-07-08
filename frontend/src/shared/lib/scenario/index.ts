import type { SavedComparisonScenario } from '@/shared/lib/atlas'

export function downloadCsvFile(fileName: string, rows: string[][]) {
  const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`
  const csv = rows.map((row) => row.map((value) => escapeCsv(value)).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadJsonFile(fileName: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function readStoredScenarios(storageKey: string) {
  if (typeof window === 'undefined') {
    return [] as SavedComparisonScenario[]
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey)
    if (!rawValue) {
      return [] as SavedComparisonScenario[]
    }

    return parseScenarioArray(rawValue)
  } catch {
    return [] as SavedComparisonScenario[]
  }
}

export function writeStoredScenarios(storageKey: string, scenarios: SavedComparisonScenario[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(scenarios))
}

export function readStoredScenariosFromText(rawValue: string) {
  try {
    return parseScenarioArray(rawValue)
  } catch {
    return [] as SavedComparisonScenario[]
  }
}

function parseScenarioArray(rawValue: string) {
  const parsed = JSON.parse(rawValue)
  if (!Array.isArray(parsed)) {
    return [] as SavedComparisonScenario[]
  }

  return parsed
    .filter((item) => {
      return (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        Array.isArray(item.countyIds) &&
        typeof item.activeYear === 'number' &&
        typeof item.educationLevel === 'string' &&
        typeof item.managementType === 'string' &&
        typeof item.updatedAt === 'string'
      )
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      countyIds: item.countyIds,
      activeYear: item.activeYear,
      educationLevel: item.educationLevel,
      managementType: item.managementType,
      pinned: item.pinned,
      updatedAt: item.updatedAt,
    }))
}

export function buildComparisonScenarioId(scenario: Omit<SavedComparisonScenario, 'id' | 'updatedAt'>) {
  return [
    scenario.name.trim() || 'scenario',
    scenario.countyIds.join(','),
    scenario.activeYear,
    scenario.educationLevel,
    scenario.managementType,
  ].join('__')
}

export function createSavedComparisonScenario(
  scenario: Omit<SavedComparisonScenario, 'id' | 'updatedAt'>,
): SavedComparisonScenario {
  return {
    ...scenario,
    id: buildComparisonScenarioId(scenario),
    updatedAt: new Date().toISOString(),
  }
}
