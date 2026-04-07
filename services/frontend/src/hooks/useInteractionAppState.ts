import { useState } from 'react'
import { readInitialTheme, type AtlasTheme } from '../lib/constants'
import type { InvestigationFilter } from './types'

/**
 * Atom Hook: Manages transient UI interactions like hover and panel visibility.
 */
export function useInteractionAppState() {
  const [theme, setTheme] = useState<AtlasTheme>(readInitialTheme)
  const [showGovernancePanel, setShowGovernancePanel] = useState(false)
  
  const [regionalChartView, setRegionalChartView] = useState<'comparison' | 'ranking'>('comparison')
  const [countyChartView, setCountyChartView] = useState<'comparison' | 'ranking'>('ranking')
  const [schoolWorkbenchView, setSchoolWorkbenchView] = useState<'list' | 'analysis' | 'notes'>('list')

  const [hoveredCountyId, setHoveredCountyId] = useState<string | null>(null)
  const [hoveredTownshipId, setHoveredTownshipId] = useState<string | null>(null)
  const [hoveredSchoolId, setHoveredSchoolId] = useState<string | null>(null)

  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | null>(null)
  const [investigationFilter, setInvestigationFilter] = useState<InvestigationFilter>('全部')

  return {
    theme, setTheme,
    showGovernancePanel, setShowGovernancePanel,
    regionalChartView, setRegionalChartView,
    countyChartView, setCountyChartView,
    schoolWorkbenchView, setSchoolWorkbenchView,
    hoveredCountyId, setHoveredCountyId,
    hoveredTownshipId, setHoveredTownshipId,
    hoveredSchoolId, setHoveredSchoolId,
    selectedInvestigationId, setSelectedInvestigationId,
    investigationFilter, setInvestigationFilter,
  }
}
