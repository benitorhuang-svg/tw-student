import { useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'

export const MapZoomControls: React.FC = () => {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setZoom(map.getZoom()),
  })

  return (
    <div className="map-zoom-controls">
      <button 
        type="button"
        className="map-zoom-btn" 
        onClick={() => map.zoomIn()}
        title="放大"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <div className="map-zoom-level">
        {Math.round(zoom * 10) / 10}
      </div>
      <button 
        type="button"
        className="map-zoom-btn" 
        onClick={() => map.zoomOut()}
        title="縮小"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
