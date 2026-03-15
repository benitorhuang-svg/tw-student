import { useEffect, useState } from 'react'
import {
  loadCountyBoundaries,
  loadDataManifest,
  loadEducationSummary,
  loadValidationReport,
  type CountyBoundaryCollection,
  type DataManifest,
  type EducationSummaryDataset,
  type ValidationReport,
} from '../../data/educationData'

export function useAtlasBootstrap() {
  const [summaryDataset, setSummaryDataset] = useState<EducationSummaryDataset | null>(null)
  const [countyBoundaries, setCountyBoundaries] = useState<CountyBoundaryCollection | null>(null)
  const [localManifest, setLocalManifest] = useState<DataManifest | null>(null)
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      loadEducationSummary(),
      loadCountyBoundaries(),
      loadDataManifest().catch(() => null),
      loadValidationReport().catch(() => null),
    ])
      .then(([nextSummary, nextBoundaries, nextManifest, nextValidationReport]) => {
        setSummaryDataset(nextSummary)
        setCountyBoundaries(nextBoundaries)
        setLocalManifest(nextManifest)
        setValidationReport(nextValidationReport)
      })
      .catch((error: Error) => setLoadError(error.message))
  }, [])

  return {
    summaryDataset,
    countyBoundaries,
    localManifest,
    validationReport,
    loadError,
    setSummaryDataset,
    setCountyBoundaries,
    setLocalManifest,
    setValidationReport,
  }
}
