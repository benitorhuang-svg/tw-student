const BUCKET_PRECISIONS = [5, 6, 7]
const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

function encodeGeohash(latitude, longitude, precision) {
  let latMin = -90
  let latMax = 90
  let lonMin = -180
  let lonMax = 180
  let isLongitudeTurn = true
  let bit = 0
  let character = 0
  let geohash = ''

  while (geohash.length < precision) {
    if (isLongitudeTurn) {
      const lonMid = (lonMin + lonMax) / 2
      if (longitude >= lonMid) {
        character = (character << 1) | 1
        lonMin = lonMid
      } else {
        character <<= 1
        lonMax = lonMid
      }
    } else {
      const latMid = (latMin + latMax) / 2
      if (latitude >= latMid) {
        character = (character << 1) | 1
        latMin = latMid
      } else {
        character <<= 1
        latMax = latMid
      }
    }

    isLongitudeTurn = !isLongitudeTurn
    bit += 1
    if (bit === 5) {
      geohash += GEOHASH_BASE32[character]
      bit = 0
      character = 0
    }
  }

  return geohash
}

function buildSchoolBuckets(schools, precision) {
  const buckets = new Map()

  schools.forEach((school) => {
    const geohash = encodeGeohash(school.coordinates.latitude, school.coordinates.longitude, precision)
    const existing = buckets.get(geohash)
    const currentStudents = school.yearlyStudents.at(-1)?.students ?? 0
    const topSchool = {
      id: school.id,
      name: school.name,
      townshipName: school.townshipId.split(':').at(-1) ?? school.townshipId,
      students: currentStudents,
      status: school.status ?? '正常',
    }

    if (existing) {
      existing.count += 1
      existing.totalStudents += currentStudents
      existing.latitudeTotal += school.coordinates.latitude
      existing.longitudeTotal += school.coordinates.longitude
      existing.bounds.minLatitude = Math.min(existing.bounds.minLatitude, school.coordinates.latitude)
      existing.bounds.maxLatitude = Math.max(existing.bounds.maxLatitude, school.coordinates.latitude)
      existing.bounds.minLongitude = Math.min(existing.bounds.minLongitude, school.coordinates.longitude)
      existing.bounds.maxLongitude = Math.max(existing.bounds.maxLongitude, school.coordinates.longitude)
      existing.topSchools.push(topSchool)
      return
    }

    buckets.set(geohash, {
      id: `${precision}-${geohash}`,
      geohash,
      precision,
      count: 1,
      totalStudents: currentStudents,
      latitudeTotal: school.coordinates.latitude,
      longitudeTotal: school.coordinates.longitude,
      bounds: {
        minLatitude: school.coordinates.latitude,
        maxLatitude: school.coordinates.latitude,
        minLongitude: school.coordinates.longitude,
        maxLongitude: school.coordinates.longitude,
      },
      topSchools: [topSchool],
    })
  })

  return [...buckets.values()]
    .map((bucket) => ({
      id: bucket.id,
      geohash: bucket.geohash,
      precision: bucket.precision,
      count: bucket.count,
      totalStudents: bucket.totalStudents,
      latitude: Number((bucket.latitudeTotal / bucket.count).toFixed(6)),
      longitude: Number((bucket.longitudeTotal / bucket.count).toFixed(6)),
      bounds: {
        minLatitude: Number(bucket.bounds.minLatitude.toFixed(6)),
        maxLatitude: Number(bucket.bounds.maxLatitude.toFixed(6)),
        minLongitude: Number(bucket.bounds.minLongitude.toFixed(6)),
        maxLongitude: Number(bucket.bounds.maxLongitude.toFixed(6)),
      },
      topSchools: bucket.topSchools.sort((left, right) => right.students - left.students).slice(0, 4),
    }))
    .sort((left, right) => right.count - left.count)
}

export function buildCountyBucketSlice(county) {
  const schools = county.towns.flatMap((town) => town.schools)

  return {
    generatedAt: new Date().toISOString(),
    county: {
      id: county.id,
      countyCode: county.countyCode,
      legacyCountyId: county.legacyCountyId,
      name: county.name,
      shortLabel: county.shortLabel,
      region: county.region,
    },
    precisions: Object.fromEntries(BUCKET_PRECISIONS.map((precision) => [precision, buildSchoolBuckets(schools, precision)])),
  }
}
