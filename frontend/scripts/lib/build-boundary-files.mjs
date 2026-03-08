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
  'https://www.tgos.tw/tgos/VirtualDir/Product/1cd4f4c9-6b01-4cf9-bf6c-23a73aa17d24/%E7%9B%B4%E8%BD%84%E5%B8%82%E3%80%81%E7%B8%A3(%E5%B8%82)%E7%95%8C%E7%B7%9A1140318.zip',
]
const TOWNSHIP_BOUNDARY_URLS = [
  'https://maps.nlsc.gov.tw/download/%E9%84%89%E9%8E%AE%E5%B8%82%E5%8D%80%E7%95%8C%E7%B7%9A(TWD97%E7%B6%93%E7%B7%AF%E5%BA%A6).zip',
  'https://www.tgos.tw/tgos/VirtualDir/Product/3fe61d4a-ca23-4f45-8aca-4a536f40f290/%E9%84%89(%E9%8E%AE%E3%80%81%E5%B8%82%E3%80%81%E5%8D%80)%E7%95%8C%E7%B7%9A1140318.zip',
]

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
      return sanitizeFeature(feature, {
        countyId: countyName,
        countyCode: String(feature.properties.COUNTYCODE ?? '').trim(),
        countyName,
        countyEng: normalizeText(feature.properties.COUNTYENG),
        shortLabel: shortCountyLabel(countyName),
        region: REGION_BY_COUNTY[countyName],
        townshipFile: `${countyName}.topo.json`,
      })
    })
    .filter((feature) => feature.properties.region)

  const townshipFeatures = flattenShapeResult(townshipResult)
    .filter((feature) => normalizeTownName(feature.properties.TOWNNAME))
    .map((feature) => {
      const countyName = normalizeCountyName(feature.properties.COUNTYNAME)
      const townName = normalizeTownName(feature.properties.TOWNNAME)
      return sanitizeFeature(feature, {
        countyId: countyName,
        countyCode: String(feature.properties.COUNTYCODE ?? '').trim(),
        countyName,
        townId: `${countyName}:${townName}`,
        townCode: String(feature.properties.TOWNCODE ?? '').trim(),
        townName,
        townEng: normalizeText(feature.properties.TOWNENG),
        region: REGION_BY_COUNTY[countyName],
      })
    })
    .filter((feature) => feature.properties.region)

  return {
    countyTopology: topology({ counties: { type: 'FeatureCollection', features: countyFeatures } }, TOPOLOGY_QUANTIZATION),
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