import { fetchJson, normalizeText } from '../refresh-helpers.mjs'

const MANUAL_COORDINATE_OVERRIDES = {
  '011314': {
    longitude: 121.437438,
    latitude: 24.975626,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依公開校址人工覆核校正。',
    matchType: 'manual-reviewed-address',
    matchScore: 100,
  },
  '013501': {
    longitude: 121.360219,
    latitude: 25.07294,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依學校官網公開校址人工覆核校正。',
    matchType: 'manual-reviewed-address',
    matchScore: 98.9,
  },
  '031301': {
    longitude: 121.244791,
    latitude: 24.847446,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依公開校名 POI 人工覆核校正。',
    matchType: 'manual-reviewed-poi',
    matchScore: 100,
  },
  '07C301': {
    longitude: 120.60514,
    latitude: 23.876389,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依公開校址人工覆核校正。',
    matchType: 'manual-reviewed-address',
    matchScore: 82.22,
  },
  '084703': {
    longitude: 120.865995,
    latitude: 23.928052,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依公開校址人工覆核校正。',
    matchType: 'manual-reviewed-address',
    matchScore: 98.33,
  },
  '121502': {
    longitude: 120.4271,
    latitude: 22.608,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依公開校名 POI 人工覆核校正。',
    matchType: 'manual-reviewed-poi',
    matchScore: 100,
  },
  '113502': {
    longitude: 120.308156,
    latitude: 23.116287,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依學校官網公開校址人工覆核校正。',
    matchType: 'manual-reviewed-address',
    matchScore: 98.24,
  },
  193667: {
    longitude: 120.691423,
    latitude: 24.186995,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依校址人工覆核校正。',
    matchType: 'manual-review',
    matchScore: 100,
  },
  '311601': {
    longitude: 121.553726,
    latitude: 25.049817,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已比對同校高國中部既有 GIS 點位人工覆核校正。',
    matchType: 'related-school-point',
    matchScore: 100,
  },
  '331601': {
    longitude: 121.54821,
    latitude: 25.039557,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已比對同校高國中部既有 GIS 點位人工覆核校正。',
    matchType: 'related-school-point',
    matchScore: 100,
  },
  '381601': {
    longitude: 121.546564,
    latitude: 24.998751,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已比對同校高國中部既有 GIS 點位人工覆核校正。',
    matchType: 'related-school-point',
    matchScore: 100,
  },
  '400144': {
    longitude: 121.586891,
    latitude: 25.082367,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已比對校本部既有點位人工覆核校正。',
    matchType: 'related-school-point',
    matchScore: 100,
  },
  '411601': {
    longitude: 121.537966,
    latitude: 25.105746,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已比對同校高國中部既有 GIS 點位人工覆核校正。',
    matchType: 'related-school-point',
    matchScore: 100,
  },
  '551303': {
    longitude: 120.326031,
    latitude: 22.673152,
    resolution: '人工校正',
    note: '正式統計資料存在但 GIS 點位缺失，座標已依公開校名 POI 人工覆核校正。',
    matchType: 'manual-reviewed-poi',
    matchScore: 100,
  },
}

const GEOCODER_ACCEPTED_TYPES = new Set(['PointAddress', 'StreetAddress', 'StreetAddressExt', 'StreetName', 'POI'])

function normalizeAddressForGeocoding(address) {
  return normalizeText(address)
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .trim()
}

function buildCoordinateResult(candidate, resolution, note) {
  return {
    longitude: Number(candidate.location.x.toFixed(6)),
    latitude: Number(candidate.location.y.toFixed(6)),
    resolution,
    note,
    matchType: candidate.attributes?.Addr_type ?? '',
    matchScore: Number(candidate.score ?? 0),
  }
}

function getAcceptedCandidate(response, minimumScore = 80) {
  const candidate = response?.candidates?.[0]
  if (!candidate) {
    return null
  }

  const matchType = candidate.attributes?.Addr_type ?? ''
  const matchScore = Number(candidate.score ?? 0)
  if (!GEOCODER_ACCEPTED_TYPES.has(matchType) || matchScore < minimumScore) {
    return null
  }

  return candidate
}

export async function resolveMissingSchoolCoordinate({ code, schoolName, countyName, townName, address }) {
  const manualOverride = MANUAL_COORDINATE_OVERRIDES[code]
  if (manualOverride) {
    return manualOverride
  }

  const normalizedAddress = normalizeAddressForGeocoding(address)

  try {
    if (normalizedAddress) {
      const addressQuery = new URLSearchParams({
        f: 'pjson',
        singleLine: normalizedAddress,
        countryCode: 'TWN',
        maxLocations: '1',
        outFields: 'Match_addr,Addr_type,Score',
      })

      const addressResponse = await fetchJson(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${addressQuery.toString()}`)
      const addressCandidate = getAcceptedCandidate(addressResponse, 80)
      if (addressCandidate) {
        return buildCoordinateResult(
          addressCandidate,
          addressCandidate.attributes?.Addr_type === 'StreetName' ? '地址解點' : '地址解點',
          addressCandidate.attributes?.Addr_type === 'StreetName'
            ? '正式統計資料存在但 GIS 點位缺失，座標改採校址街道解點。'
            : '正式統計資料存在但 GIS 點位缺失，座標改採校址解點。',
        )
      }
    }

    const schoolQueryText = normalizeText(`${countyName}${townName}${schoolName}`).replace(/\s+/g, '')
    if (!schoolQueryText) {
      return null
    }

    const schoolQuery = new URLSearchParams({
      f: 'pjson',
      singleLine: schoolQueryText,
      countryCode: 'TWN',
      category: 'Education',
      maxLocations: '1',
      outFields: 'Match_addr,Addr_type,Score',
    })

    const schoolResponse = await fetchJson(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${schoolQuery.toString()}`)
    const schoolCandidate = getAcceptedCandidate(schoolResponse, 85)
    if (!schoolCandidate) {
      return null
    }

    return buildCoordinateResult(
      schoolCandidate,
      '地址解點',
      '正式統計資料存在但 GIS 點位缺失，座標改採學校名稱與行政區 POI 解點。',
    )
  } catch (error) {
    console.warn(`Failed to geocode missing school ${code}: ${normalizedAddress || schoolName}`)
    console.warn(error)
    return null
  }
}
