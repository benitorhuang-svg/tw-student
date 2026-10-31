import { TileLayer } from 'react-leaflet'
import { DARK_TILE_URL, LIGHT_TILE_URL } from '../mapStyles'

interface MapTileLayerProps {
  theme: 'light' | 'dark'
}

export function MapTileLayer({ theme }: MapTileLayerProps) {
  const tileUrl = theme === 'dark' ? DARK_TILE_URL : LIGHT_TILE_URL
  const isCustomCarto = Boolean(import.meta.env.VITE_CARTO_API_KEY)
  const tileOpacity = theme === 'dark' ? 0.8 : 0.95

  return (
    <TileLayer
      key={`${tileUrl}-${theme}`}
      url={tileUrl}
      opacity={tileOpacity}
      attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
      className={!isCustomCarto && theme === 'dark' ? 'atlas-tile-layer--dark' : 'atlas-tile-layer--light'}
    />
  )
}
