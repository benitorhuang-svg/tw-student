/**
 * Atomic visibility rules for map layers based on zoom level.
 * Logic extracted from hook to satisfy Atomic Design principles.
 */

export type MapLayerVisibility = {
  showCountyMarkers: boolean
  showTownshipMarkers: boolean
  showSchoolMarkers: boolean
}

export function computeLayerVisibility(zoom: number, hasSchoolPoints: boolean, isSchoolSelected: boolean): MapLayerVisibility {
  // | Zoom   | Counties | Townships | Schools |
  // |--------|----------|-----------|---------|
  // | 7–9    | ✔        |           |         |
  // | 10–11  | (small)  | ✔         |         |
  // | 12–13  |          | (small)   | ✔       |
  
  const showCountyMarkers = zoom < 11
  const showTownshipMarkers = zoom >= 10 && zoom < 13
  
  // Schools become visible at zoom 12
  let showSchoolMarkers = zoom >= 12 && hasSchoolPoints
  
  // Always allow an explicit school selection to surface its marker
  if (isSchoolSelected) showSchoolMarkers = true
  
  return {
    showCountyMarkers,
    showTownshipMarkers,
    showSchoolMarkers,
  }
}
