import { useEffect, useState } from 'react'
import {
  getAtlasLoadObservations,
  subscribeAtlasLoadObservations,
  type AtlasLoadObservationSnapshot,
} from '@/shared/api/data/educationData'

export function useAtlasLoadObservation() {
  const [loadObservation, setLoadObservation] = useState<AtlasLoadObservationSnapshot>(getAtlasLoadObservations())

  useEffect(() => subscribeAtlasLoadObservations(setLoadObservation), [])

  return loadObservation
}
