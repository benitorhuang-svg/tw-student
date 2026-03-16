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
  
  // Schools become visible at zoom 13
  let showSchoolMarkers = (zoom >= 13 && hasSchoolPoints)
  
  // If a school is selected, we ALWAYS show school markers
  if (isSchoolSelected) showSchoolMarkers = true
  
  // EXCLUSIVITY RULE: Hide counties earlier (zoom 10) to clear view for townships
  const showCountyMarkers = zoom < 10 && !showSchoolMarkers
  const showTownshipMarkers = zoom >= 9.5 && zoom < 13 && !isSchoolSelected
  
  return {
    showCountyMarkers,
    showTownshipMarkers,
    showSchoolMarkers,
  }
}
