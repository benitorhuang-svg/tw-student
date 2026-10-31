/**
 * Atomic visibility rules for map layers based on zoom level.
 * Logic extracted from hook to satisfy Atomic Design principles.
 */

export type MapLayerVisibility = {
  showCountyMarkers: boolean
  showTownshipMarkers: boolean
  showSchoolMarkers: boolean
}

export function computeLayerVisibility(zoom: number, hasSchoolPoints: boolean, hasActiveCounty = true): MapLayerVisibility {
  // Selecting a county enables township labels at zoom 10 and school points at 12.
  // The national view stays at county level, including when full labels are enabled.

  const showSchoolMarkers = hasActiveCounty && zoom >= 12.0 && hasSchoolPoints
  const showCountyMarkers = zoom < 12.0 || !hasActiveCounty
  const showTownshipMarkers = hasActiveCounty && zoom >= 10.0

  return {
    showCountyMarkers,
    showTownshipMarkers,
    showSchoolMarkers,
  }
}
