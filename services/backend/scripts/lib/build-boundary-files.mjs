import shp from 'shpjs'
import { topology } from 'topojson-server'

import {
  REGION_BY_COUNTY,
  fetchArrayBufferWithFallback,
  flattenShapeResult,
  normalizeCountyName,
  normalizeText,
  normalizeTownName,
  sanitizeFeature,
  shortCountyLabel,
} from './refresh-helpers.mjs'

const TOPOLOGY_QUANTIZATION = 1e5
const COUNTY_BOUNDARY_URLS = [
  'https://maps.nlsc.gov.tw/download/%E7%9B%B4%E8%BD%84%E5%B8%82%E3%80%81%E7%B8%A3(%E5%B8%82)%E7%95%8C%E7%B7%9A(TWD97%E7%B6%93%E7%B7%AF%E5%BA%A6).zip',
]
const TOWNSHIP_BOUNDARY_URLS = [
  'https://maps.nlsc.gov.tw/download/%E9%84%89%E9%8E%AE%E5%B8%82%E5%8D%80%E7%95%8C%E7%B7%9A(TWD97%E7%B6%93%E7%B7%AF%E5%BA%A6).zip',
]

function ringArea(ring) {
  let area = 0
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index]
    const [x2, y2] = ring[index + 1]
    area += (x1 * y2) - (x2 * y1)
  }
  return area / 2
}

function ringCentroid(ring) {
  let signedArea = 0
  let centroidX = 0
  let centroidY = 0

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = ring[index]
    const [x2, y2] = ring[index + 1]
    const cross = (x1 * y2) - (x2 * y1)
    signedArea += cross
    centroidX += (x1 + x2) * cross
    centroidY += (y1 + y2) * cross
  }

  const area = signedArea / 2
  if (!area) return ring[0]

  return [centroidX / (6 * area), centroidY / (6 * area)]
}

function pointInRing(point, ring) {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [xi, yi] = ring[index]
    const [xj, yj] = ring[previous]
    const intersects = ((yi > point[1]) !== (yj > point[1]))
      && (point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || Number.EPSILON) + xi)
    if (intersects) inside = !inside
  }
  return inside
}

function pointInPolygon(point, polygon) {
  if (!pointInRing(point, polygon[0])) return false
  for (let index = 1; index < polygon.length; index += 1) {
    if (pointInRing(point, polygon[index])) return false
  }
  return true
}

function getBounds(ring) {
  return ring.reduce((bounds, [x, y]) => ({
    minX: Math.min(bounds.minX, x),
    maxX: Math.max(bounds.maxX, x),
    minY: Math.min(bounds.minY, y),
    maxY: Math.max(bounds.maxY, y),
  }), { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY })
}

function findInteriorPoint(polygon, preferredPoint) {
  if (pointInPolygon(preferredPoint, polygon)) return preferredPoint

  const bounds = getBounds(polygon[0])
  let bestPoint = polygon[0][0]
  let bestDistance = Number.POSITIVE_INFINITY

  for (let yStep = 1; yStep <= 12; yStep += 1) {
    for (let xStep = 1; xStep <= 12; xStep += 1) {
      const point = [
        bounds.minX + ((bounds.maxX - bounds.minX) * xStep) / 13,
        bounds.minY + ((bounds.maxY - bounds.minY) * yStep) / 13,
      ]
      if (!pointInPolygon(point, polygon)) continue

      const distance = Math.hypot(point[0] - preferredPoint[0], point[1] - preferredPoint[1])
      if (distance < bestDistance) {
        bestDistance = distance
        bestPoint = point
      }
    }
  }

  return bestPoint
}

function getRepresentativePoint(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const largestPolygon = [...polygons].sort((left, right) => Math.abs(ringArea(right[0])) - Math.abs(ringArea(left[0])))[0]
  const centroid = ringCentroid(largestPolygon[0])
  const point = findInteriorPoint(largestPolygon, centroid)
  return {
    longitude: Number(point[0].toFixed(6)),
    latitude: Number(point[1].toFixed(6)),
  }
}

export async function buildBoundaryFiles() {
  const [countyZip, townshipZip] = await Promise.all([
    fetchArrayBufferWithFallback(COUNTY_BOUNDARY_URLS),
    fetchArrayBufferWithFallback(TOWNSHIP_BOUNDARY_URLS),
  ])

  const countyResult = await shp(countyZip)
  const townshipResult = await shp(townshipZip)

  const countyFeatures = flattenShapeResult(countyResult)
    .filter((feature) => normalizeCountyName(feature.properties.COUNTYNAME))
    .map((feature) => {
      const countyName = normalizeCountyName(feature.properties.COUNTYNAME)
      const representativePoint = getRepresentativePoint(feature.geometry)
      return sanitizeFeature(feature, {
        countyId: countyName,
        countyCode: String(feature.properties.COUNTYCODE ?? '').trim(),
        countyName,
        countyEng: normalizeText(feature.properties.COUNTYENG),
        shortLabel: shortCountyLabel(countyName),
        region: REGION_BY_COUNTY[countyName],
        townshipFile: `${countyName}.topo.json`,
        centerLongitude: representativePoint.longitude,
        centerLatitude: representativePoint.latitude,
      })
    })
    .filter((feature) => feature.properties.region)

  const townshipFeatures = flattenShapeResult(townshipResult)
    .filter((feature) => normalizeTownName(feature.properties.TOWNNAME))
    .map((feature) => {
      const countyName = normalizeCountyName(feature.properties.COUNTYNAME)
      const townName = normalizeTownName(feature.properties.TOWNNAME)
      const representativePoint = getRepresentativePoint(feature.geometry)
      return sanitizeFeature(feature, {
        countyId: countyName,
        countyCode: String(feature.properties.COUNTYCODE ?? '').trim(),
        countyName,
        townId: `${countyName}:${townName}`,
        townCode: String(feature.properties.TOWNCODE ?? '').trim(),
        townName,
        townEng: normalizeText(feature.properties.TOWNENG),
        region: REGION_BY_COUNTY[countyName],
        centerLongitude: representativePoint.longitude,
        centerLatitude: representativePoint.latitude,
      })
    })
    .filter((feature) => feature.properties.region)

  const countyCoordinateLookup = Object.fromEntries(
    countyFeatures.map((feature) => [feature.properties.countyId, {
      countyId: feature.properties.countyId,
      legacyCountyId: feature.properties.countyId,
      countyCode: feature.properties.countyCode,
      countyName: feature.properties.countyName,
      region: feature.properties.region,
      longitude: feature.properties.centerLongitude,
      latitude: feature.properties.centerLatitude,
    }]),
  )

  const townshipCoordinateLookup = Object.fromEntries(
    townshipFeatures.map((feature) => [feature.properties.townId, {
      countyId: feature.properties.countyId,
      legacyCountyId: feature.properties.countyId,
      countyCode: feature.properties.countyCode,
      countyName: feature.properties.countyName,
      townId: feature.properties.townId,
      legacyTownId: feature.properties.townId,
      townCode: feature.properties.townCode,
      townName: feature.properties.townName,
      region: feature.properties.region,
      longitude: feature.properties.centerLongitude,
      latitude: feature.properties.centerLatitude,
    }]),
  )

  return {
    countyTopology: topology({ counties: { type: 'FeatureCollection', features: countyFeatures } }, TOPOLOGY_QUANTIZATION),
    countyCoordinateLookup,
    townshipCoordinateLookup,
    townshipTopologyByCounty: countyFeatures.map((countyFeature) => {
      const countyId = countyFeature.properties.countyId
      const features = townshipFeatures.filter((feature) => feature.properties.countyId === countyId)
      return {
        countyId,
        fileName: countyFeature.properties.townshipFile,
        topology: topology({ townships: { type: 'FeatureCollection', features } }, TOPOLOGY_QUANTIZATION),
      }
    }),
  }
}
