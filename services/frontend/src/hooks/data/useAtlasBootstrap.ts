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
import { warmAtlasRuntime } from '../../data/sqlite/connection'

export function useAtlasBootstrap() {
  const [summaryDataset, setSummaryDataset] = useState<EducationSummaryDataset | null>(null)
  const [countyBoundaries, setCountyBoundaries] = useState<CountyBoundaryCollection | null>(null)
  const [localManifest, setLocalManifest] = useState<DataManifest | null>(null)
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void warmAtlasRuntime()

    void loadEducationSummary()
      .then((nextSummary) => {
        if (!cancelled) {
          setSummaryDataset(nextSummary)
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setLoadError(error.message)
        }
      })

    void loadCountyBoundaries()
      .then((nextBoundaries) => {
        if (!cancelled) {
          setCountyBoundaries(nextBoundaries)
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setLoadError(error.message)
        }
      })

    void loadDataManifest()
      .then((nextManifest) => {
        if (!cancelled) {
          setLocalManifest(nextManifest)
        }
      })
      .catch(() => null)

    void loadValidationReport()
      .then((nextValidationReport) => {
        if (!cancelled) {
          setValidationReport(nextValidationReport)
        }
      })
      .catch(() => null)

    return () => {
      cancelled = true
    }
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
