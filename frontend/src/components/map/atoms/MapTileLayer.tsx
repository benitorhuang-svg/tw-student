import { TileLayer } from 'react-leaflet'
import { DARK_TILE_URL, LIGHT_TILE_URL } from '../mapStyles'

interface MapTileLayerProps {
  theme: 'light' | 'dark'
}

export function MapTileLayer({ theme }: MapTileLayerProps) {
  const tileUrl = theme === 'dark' ? DARK_TILE_URL : LIGHT_TILE_URL
  const tileOpacity = theme === 'dark' ? 0.32 : 1
  
  return (
    <TileLayer
      key={tileUrl}
      url={tileUrl}
      opacity={tileOpacity}
      attribution="© OpenStreetMap contributors © CARTO"
    />
  )
}
