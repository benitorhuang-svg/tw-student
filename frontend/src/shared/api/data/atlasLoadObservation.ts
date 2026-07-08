import type { AtlasLoadObservationSnapshot, AtlasLoadSource } from './educationTypes'

const observationListeners = new Set<(snapshot: AtlasLoadObservationSnapshot) => void>()

let loadObservationState: AtlasLoadObservationSnapshot = {
  loadedCountyDetails: [],
  loadedBucketSlices: [],
  loadedTownshipSlices: [],
  cacheHits: 0,
  memoryHits: 0,
  sqliteHits: 0,
  networkFetches: 0,
  totalTransferredBytes: 0,
  resourceSizes: {},
  lastLoadSource: null,
}

function mergeUnique(values: string[], nextValue: string | null | undefined) {
  if (!nextValue || values.includes(nextValue)) {
    return values
  }

  return [...values, nextValue]
}

function createObservationSnapshot(): AtlasLoadObservationSnapshot {
  return {
    ...loadObservationState,
    loadedCountyDetails: [...loadObservationState.loadedCountyDetails],
    loadedBucketSlices: [...loadObservationState.loadedBucketSlices],
    loadedTownshipSlices: [...loadObservationState.loadedTownshipSlices],
    resourceSizes: { ...loadObservationState.resourceSizes },
  }
}

function emitObservation() {
  const snapshot = createObservationSnapshot()
  observationListeners.forEach((listener) => listener(snapshot))
}

export function recordResourceLoad(options: {
  source: AtlasLoadSource
  resourceKey: string
  bytes?: number
  countyDetailId?: string
  bucketCountyId?: string
  townshipCountyId?: string
}) {
  const nextSizes = { ...loadObservationState.resourceSizes }
  if (typeof options.bytes === 'number' && options.bytes > 0) {
    nextSizes[options.resourceKey] = options.bytes
  }

  loadObservationState = {
    ...loadObservationState,
    loadedCountyDetails: mergeUnique(loadObservationState.loadedCountyDetails, options.countyDetailId),
    loadedBucketSlices: mergeUnique(loadObservationState.loadedBucketSlices, options.bucketCountyId),
    loadedTownshipSlices: mergeUnique(loadObservationState.loadedTownshipSlices, options.townshipCountyId),
    cacheHits: loadObservationState.cacheHits + (options.source === 'memory' || options.source === 'sqlite' ? 1 : 0),
    memoryHits: loadObservationState.memoryHits + (options.source === 'memory' ? 1 : 0),
    sqliteHits: loadObservationState.sqliteHits + (options.source === 'sqlite' ? 1 : 0),
    networkFetches: loadObservationState.networkFetches + (options.source === 'network' ? 1 : 0),
    totalTransferredBytes: loadObservationState.totalTransferredBytes + (options.source === 'network' ? options.bytes ?? 0 : 0),
    resourceSizes: nextSizes,
    lastLoadSource: options.source,
  }

  emitObservation()
}

export function getAtlasLoadObservations() {
  return createObservationSnapshot()
}

export function subscribeAtlasLoadObservations(listener: (snapshot: AtlasLoadObservationSnapshot) => void) {
  observationListeners.add(listener)
  listener(createObservationSnapshot())

  return () => {
    observationListeners.delete(listener)
  }
}

export function resetAtlasLoadObservations() {
  loadObservationState = {
    loadedCountyDetails: [],
    loadedBucketSlices: [],
    loadedTownshipSlices: [],
    cacheHits: 0,
    memoryHits: 0,
    sqliteHits: 0,
    networkFetches: 0,
    totalTransferredBytes: 0,
    resourceSizes: {},
    lastLoadSource: null,
  }

  emitObservation()
}