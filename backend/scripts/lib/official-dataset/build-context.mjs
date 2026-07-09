import { REGION_BY_COUNTY, shortCountyLabel } from '../refresh-helpers.mjs'

export function createDatasetBuildContext(boundaries) {
  return {
    countyMap: new Map(),
    processedKeys: new Set(),
    coordinatesByCode: new Map(),
    locationByCode: new Map(),
    countyBoundaryLookup: new Map(Object.values(boundaries.countyCoordinateLookup).map((entry) => [entry.countyName, entry])),
    townshipBoundaryLookup: new Map(Object.values(boundaries.townshipCoordinateLookup).map((entry) => [entry.legacyTownId, entry])),
  }
}

export function resolveSchoolLocation(context, { countyName, townName, sharedLocation }) {
  const region = REGION_BY_COUNTY[countyName]
  if (!region || !countyName || !townName) {
    return null
  }

  const countyBoundary = context.countyBoundaryLookup.get(countyName)
  const townshipBoundary = context.townshipBoundaryLookup.get(`${countyName}:${townName}`)
  const countyId = countyName
  const townshipId = `${countyName}:${townName}`
  const countyCode = countyBoundary?.countyCode || sharedLocation?.countyCode || countyName
  const townCode = townshipBoundary?.townCode || sharedLocation?.townCode || `${countyCode}:${townName}`

  return {
    countyName,
    townName,
    region,
    countyId,
    townshipId,
    countyCode,
    townCode,
  }
}

export function ensureTown(context, location) {
  if (!context.countyMap.has(location.countyId)) {
    context.countyMap.set(location.countyId, {
      id: location.countyId,
      countyCode: location.countyCode,
      name: location.countyName,
      shortLabel: shortCountyLabel(location.countyName),
      region: location.region,
      legacyCountyId: location.countyId,
      towns: new Map(),
    })
  }

  const county = context.countyMap.get(location.countyId)
  if (!county.towns.has(location.townshipId)) {
    county.towns.set(location.townshipId, {
      id: location.townshipId,
      countyId: location.countyId,
      countyCode: location.countyCode,
      townCode: location.townCode,
      legacyTownshipId: location.townshipId,
      name: location.townName,
      schools: [],
    })
  }

  return county.towns.get(location.townshipId)
}
