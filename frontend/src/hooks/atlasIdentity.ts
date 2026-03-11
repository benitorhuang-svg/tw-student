import type { CountySummaryRecord, EducationSummaryDataset, TownshipSummaryRecord } from '../data/educationData'

function normalizeToken(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase() ?? ''
}

function buildCountyCandidates(county: CountySummaryRecord) {
  return [county.id, county.countyCode, county.legacyCountyId, county.name, county.shortLabel].filter(Boolean) as string[]
}

function buildTownshipCandidates(county: CountySummaryRecord, township: TownshipSummaryRecord) {
  return [
    township.id,
    township.townCode,
    township.legacyTownshipId,
    township.name,
    `${county.id}:${township.name}`,
    county.countyCode && township.townCode ? `${county.countyCode}:${township.townCode}` : null,
  ].filter(Boolean) as string[]
}

export function resolveCountyRecord(summaryDataset: EducationSummaryDataset | null, countyInput: string | null | undefined) {
  if (!summaryDataset || !countyInput) return null
  const normalizedInput = normalizeToken(countyInput)
  return summaryDataset.counties.find((county) => buildCountyCandidates(county).some((candidate) => normalizeToken(candidate) === normalizedInput)) ?? null
}

export function resolveTownshipRecord(
  summaryDataset: EducationSummaryDataset | null,
  countyInput: string | null | undefined,
  townshipInput: string | null | undefined,
) {
  if (!summaryDataset || !townshipInput) return null

  const normalizedInput = normalizeToken(townshipInput)
  const preferredCounty = resolveCountyRecord(summaryDataset, countyInput)
  const candidateCounties = preferredCounty ? [preferredCounty] : summaryDataset.counties

  for (const county of candidateCounties) {
    const township = county.towns.find((entry) => buildTownshipCandidates(county, entry).some((candidate) => normalizeToken(candidate) === normalizedInput))
    if (township) {
      return { county, township }
    }
  }

  return null
}

export function normalizeCountyId(summaryDataset: EducationSummaryDataset | null, countyInput: string | null | undefined) {
  return resolveCountyRecord(summaryDataset, countyInput)?.id ?? null
}

export function toCanonicalCountyId(summaryDataset: EducationSummaryDataset | null, countyInput: string | null | undefined) {
  const county = resolveCountyRecord(summaryDataset, countyInput)
  return county?.countyCode ?? county?.id ?? null
}

export function normalizeTownshipId(
  summaryDataset: EducationSummaryDataset | null,
  countyInput: string | null | undefined,
  townshipInput: string | null | undefined,
) {
  return resolveTownshipRecord(summaryDataset, countyInput, townshipInput)?.township.id ?? null
}

export function toCanonicalTownshipId(
  summaryDataset: EducationSummaryDataset | null,
  countyInput: string | null | undefined,
  townshipInput: string | null | undefined,
) {
  const resolved = resolveTownshipRecord(summaryDataset, countyInput, townshipInput)
  return resolved?.township.townCode ?? resolved?.township.id ?? null
}

export function normalizeCountyIds(summaryDataset: EducationSummaryDataset | null, countyInputs: string[]) {
  const nextIds: string[] = []

  countyInputs.forEach((countyInput) => {
    const normalizedCountyId = normalizeCountyId(summaryDataset, countyInput)
    if (normalizedCountyId && !nextIds.includes(normalizedCountyId)) {
      nextIds.push(normalizedCountyId)
    }
  })

  return nextIds
}

export function toCanonicalCountyIds(summaryDataset: EducationSummaryDataset | null, countyInputs: string[]) {
  const nextIds: string[] = []

  countyInputs.forEach((countyInput) => {
    const canonicalCountyId = toCanonicalCountyId(summaryDataset, countyInput)
    if (canonicalCountyId && !nextIds.includes(canonicalCountyId)) {
      nextIds.push(canonicalCountyId)
    }
  })

  return nextIds
}