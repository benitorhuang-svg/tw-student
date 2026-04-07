import { useState } from 'react'
import { readStoredScenarios } from './atlasHelpers'
import type { SavedComparisonScenario } from './types'
import { COMPARISON_FAVORITES_STORAGE_KEY, COMPARISON_RECENTS_STORAGE_KEY } from '../lib/constants'

/**
 * Atom Hook: Manages comparison scenarios and favorites.
 */
export function useComparisonAppState(initial: {
  comparisonCountyIds: string[]
  comparisonScenarioName: string
}) {
  const [comparisonCountyIds, setComparisonCountyIds] = useState<string[]>(initial.comparisonCountyIds)
  const [comparisonScenarioName, setComparisonScenarioName] = useState(initial.comparisonScenarioName)
  const [favoriteScenarios, setFavoriteScenarios] = useState<SavedComparisonScenario[]>(() => 
    readStoredScenarios(COMPARISON_FAVORITES_STORAGE_KEY)
  )
  const [recentScenarios, setRecentScenarios] = useState<SavedComparisonScenario[]>(() => 
    readStoredScenarios(COMPARISON_RECENTS_STORAGE_KEY)
  )

  return {
    comparisonCountyIds, setComparisonCountyIds,
    comparisonScenarioName, setComparisonScenarioName,
    favoriteScenarios, setFavoriteScenarios,
    recentScenarios, setRecentScenarios,
  }
}
