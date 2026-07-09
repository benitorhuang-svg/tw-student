import { writeFile } from 'node:fs/promises'

export function flattenShapeResult(shapeResult) {
  if (shapeResult.type === 'FeatureCollection') return shapeResult.features
  if (Array.isArray(shapeResult)) return shapeResult.flatMap((item) => flattenShapeResult(item))
  return []
}

function roundCoordinates(value) {
  if (Array.isArray(value)) return value.map(roundCoordinates)
  if (typeof value === 'number') return Number(value.toFixed(6))
  return value
}

export function sanitizeFeature(feature, properties) {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: feature.geometry.type,
      coordinates: roundCoordinates(feature.geometry.coordinates),
    },
  }
}

export async function writePrettyJson(filePath, value) {
  await writeFile(filePath, JSON.stringify(value, null, 2) + '\n')
}

export function measurePrettyJsonBytes(value) {
  return new TextEncoder().encode(JSON.stringify(value, null, 2) + '\n').length
}
