import { useEffect, useState } from 'react'
import {
  getAtlasLoadObservations,
  subscribeAtlasLoadObservations,
  type AtlasLoadObservationSnapshot,
} from '../data/educationData'

export function useAtlasLoadObservation() {
  const [loadObservation, setLoadObservation] = useState<AtlasLoadObservationSnapshot>(getAtlasLoadObservations())

  useEffect(() => subscribeAtlasLoadObservations(setLoadObservation), [])

  return loadObservation
}
