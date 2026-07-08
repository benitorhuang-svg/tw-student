import { useMapEvents } from 'react-leaflet'

export type MapEventsProps = {
  onBackgroundClick: () => void
}

export function MapEvents({ onBackgroundClick }: MapEventsProps) {
  useMapEvents({
    click: (e) => {
      // Leaflet propagates clicks to the map unless stopped.
      // We check if the target is actually the map pane or container.
      const target = e.originalEvent.target as HTMLElement
      if (
        target.classList.contains('leaflet-container') || 
        target.classList.contains('leaflet-pane')
      ) {
        onBackgroundClick()
      }
    },
  })
  return null
}
