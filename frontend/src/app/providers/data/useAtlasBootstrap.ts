import { useEffect, useState } from 'react'
import {
  loadCountyBoundaries,
  loadDataManifest,
  loadEducationSummary,
  loadValidationReport,
  warmAtlasRuntime,
  type CountyBoundaryCollection,
  type DataManifest,
  type EducationSummaryDataset,
  type ValidationReport,
} from '@/shared/api/data/educationData'

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
      .catch((err) => {
        console.warn('Failed to load data in bootstrap:', err)
      })

    void loadValidationReport()
      .then((nextValidationReport) => {
        if (!cancelled) {
          setValidationReport(nextValidationReport)
        }
      })
      .catch((err) => {
        console.warn('Failed to load data in bootstrap:', err)
      })

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
