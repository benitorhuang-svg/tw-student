import type { CountyBoundaryProperties } from '@/shared/api/data/educationData'

const COUNTY_MAP_ANCHORS: Record<string, [number, number]> = {
  基隆市: [25.13, 121.86],
  臺北市: [24.94, 121.63],
  新北市: [25.23, 121.56],
  桃園市: [24.99, 121.30],
  新竹市: [24.76, 120.98],
  新竹縣: [24.62, 121.28],
  苗栗縣: [24.50, 120.90],
  臺中市: [24.19, 120.75],
  彰化縣: [23.94, 120.45],
  南投縣: [23.83, 121.00],
  雲林縣: [23.70, 120.42],
  嘉義市: [23.45, 120.65],
  嘉義縣: [23.45, 120.33],
  臺南市: [23.13, 120.32],
  高雄市: [23.00, 120.65],
  屏東縣: [22.60, 120.60],
  宜蘭縣: [24.58, 121.65],
  花蓮縣: [23.77, 121.40],
  臺東縣: [22.95, 121.06],
  澎湖縣: [23.57, 119.57],
  金門縣: [24.43, 118.31],
  連江縣: [26.16, 119.94],
}

export function resolveCountyMapAnchor(properties: CountyBoundaryProperties): [number, number] {
  return COUNTY_MAP_ANCHORS[properties.countyId] ?? [
    properties.centerLatitude,
    properties.centerLongitude,
  ]
}
