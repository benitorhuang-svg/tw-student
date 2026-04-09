/**
 * Atomic visibility rules for map layers based on zoom level.
 * Logic extracted from hook to satisfy Atomic Design principles.
 */

export type MapLayerVisibility = {
  showCountyMarkers: boolean
  showTownshipMarkers: boolean
  showSchoolMarkers: boolean
}

export function computeLayerVisibility(zoom: number, hasSchoolPoints: boolean): MapLayerVisibility {
  // Revised Zoom-based Visibility Rules:
  // | Level          | Zoom Range  | Layers Shown              |
  // |----------------|-------------|---------------------------|
  // | County Level   | < 12.0      | Counties                  |
  // | School Level   | >= 12.0     | Townships + Schools       |
  //
  // User Requirements:
  // 1. County + Township levels should NOT show schools.
  // 2. Zoom >= 12 shows Townships + Schools (No Counties).
  // 3. Zoom >= 12 is the threshold for detailed exploration.

  const showSchoolMarkers = zoom >= 12.0 && hasSchoolPoints
  const showCountyMarkers = zoom < 12.0
  const showTownshipMarkers = zoom >= 10.5

  return {
    showCountyMarkers,
    showTownshipMarkers,
    showSchoolMarkers,
  }
}
