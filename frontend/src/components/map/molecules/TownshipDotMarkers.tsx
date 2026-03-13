// TownshipDotMarkers is now implemented as a canvas‑based layer.  The
// original React‑Marker implementation lived here but was removed because
// hundreds of `<Marker>` nodes were causing severe jank on zoom/pan.  We
// export the new component under the same name for backwards compatibility.

import CanvasTownshipLayer from './CanvasTownshipLayer'

export type { CanvasTownshipLayerProps } from './CanvasTownshipLayer'
export default CanvasTownshipLayer
