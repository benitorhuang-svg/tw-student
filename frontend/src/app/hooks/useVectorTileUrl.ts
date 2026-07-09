import { useState } from 'react'

export function useVectorTileUrl() {
  return useState(() => {
    const url = new URL(window.location.href)
    const queryFlag = url.searchParams.get('vectorTiles')
    const shouldUseVectorTiles = queryFlag === 'true' || import.meta.env.VITE_USE_VECTOR_TILES === 'true'

    return shouldUseVectorTiles ? import.meta.env.VITE_VECTOR_TILE_BASE_URL || '/data/tiles' : ''
  })
}
