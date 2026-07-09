import { ACADEMIC_YEARS, toCountyBucketFile, toCountyDetailFile } from '../refresh-helpers.mjs'
import { buildCountyBucketSlice } from '../build-county-buckets.mjs'
import { buildScopeNotes, buildSummarySeries } from './school-summaries.mjs'

export function buildOfficialDatasetOutput({ countyMap, dataNotes, missingCoordinates }) {
    const counties = [...countyMap.values()]
      .map((county) => {
        const towns = [...county.towns.values()]
          .map((town) => {
            const schools = town.schools.sort((left, right) => (right.yearlyStudents.at(-1)?.students ?? 0) - (left.yearlyStudents.at(-1)?.students ?? 0))
            return { ...town, schools, dataNotes: buildScopeNotes(schools, town.name) }
          })
          .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'))

        const countySchools = towns.flatMap((town) => town.schools)
        return {
          id: county.id,
          countyCode: county.countyCode,
          legacyCountyId: county.legacyCountyId,
          name: county.name,
          shortLabel: county.shortLabel,
          region: county.region,
          towns,
          dataNotes: buildScopeNotes(countySchools, county.name),
        }
      })
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'))

    const schoolIdCounts = new Map()
    counties.forEach((county) => {
      county.towns.forEach((town) => {
        town.schools.forEach((school) => {
          schoolIdCounts.set(school.id, (schoolIdCounts.get(school.id) ?? 0) + 1)
        })
      })
    })

    counties.forEach((county) => {
      county.towns.forEach((town) => {
        town.schools.forEach((school) => {
          if ((schoolIdCounts.get(school.id) ?? 0) > 1) {
            school.id = `${school.code}:${school.educationLevel}`
          }
        })
      })
    })

    const sources = {
      points: 'https://stats.moe.gov.tw/portal/apps/experiencebuilder/experience/?id=518f8458d5fb44e288e8fe5c95457c20',
      statistics: 'https://depart.moe.gov.tw/ED4500/News_Content.aspx?n=5A930C32CC6C3818&sms=91B3AAE8C6388B96&s=33128143574210DF',
      townshipBoundaries: 'https://data.gov.tw/dataset/7441',
      countyBoundaries: 'https://data.gov.tw/dataset/7442',
    }

    // ── Build school code index for frontend search ──
    const schoolCodeIndex = {}
    const schoolCoordinateLookup = {}
    const levelOrder = new Map([['國小', 1], ['國中', 2], ['高中職', 3], ['大專院校', 4]])
    for (const county of counties) {
      for (const town of county.towns) {
        for (const school of town.schools) {
          const existingIndexEntry = schoolCodeIndex[school.code]
          schoolCodeIndex[school.code] = {
            countyId: existingIndexEntry?.countyId ?? county.id,
            townshipId: existingIndexEntry?.townshipId ?? town.id,
            countyCode: existingIndexEntry?.countyCode ?? county.countyCode,
            townCode: existingIndexEntry?.townCode ?? town.townCode,
            countyName: existingIndexEntry?.countyName ?? county.name,
            townshipName: existingIndexEntry?.townshipName ?? town.name,
            name: existingIndexEntry?.name ?? school.name,
            schoolIds: [...new Set([...(existingIndexEntry?.schoolIds ?? []), school.id])],
            levels: [...new Set([...(existingIndexEntry?.levels ?? []), school.educationLevel])].sort((left, right) => (levelOrder.get(left) ?? 99) - (levelOrder.get(right) ?? 99)),
            longitude: existingIndexEntry?.longitude ?? school.coordinates.longitude,
            latitude: existingIndexEntry?.latitude ?? school.coordinates.latitude,
          }
          schoolCoordinateLookup[school.code] = {
            code: school.code,
            name: school.name,
            countyId: county.id,
            townshipId: town.id,
            countyCode: county.countyCode,
            townCode: town.townCode,
            longitude: school.coordinates.longitude,
            latitude: school.coordinates.latitude,
          }
        }
      }
    }

    const generatedAt = new Date().toISOString()
    return {
      generatedAt,
      years: ACADEMIC_YEARS,
      sources,
      missingCoordinates,
      summaryDataset: {
        generatedAt,
        years: ACADEMIC_YEARS,
        sources,
        dataNotes,
        schoolCodeIndex,
        missingCoordinates,
        counties: counties.map((county) => ({
          id: county.id,
          countyCode: county.countyCode,
          legacyCountyId: county.legacyCountyId,
          name: county.name,
          shortLabel: county.shortLabel,
          region: county.region,
          townshipFile: `townships/${county.id}.topo.json`,
          detailFile: `counties/${toCountyDetailFile(county.id)}`,
          bucketFile: `buckets/${toCountyBucketFile(county.id)}`,
          dataNotes: county.dataNotes,
          summaries: buildSummarySeries(county.towns.flatMap((town) => town.schools)),
          towns: county.towns.map((town) => ({
            id: town.id,
            countyId: town.countyId,
            countyCode: town.countyCode,
            townCode: town.townCode,
            legacyTownshipId: town.legacyTownshipId,
            name: town.name,
            dataNotes: town.dataNotes,
            summaries: buildSummarySeries(town.schools),
          })),
        })),
      },
      countyDetails: counties.map((county) => ({
        fileName: toCountyDetailFile(county.id),
        detail: {
          county: {
            id: county.id,
            countyCode: county.countyCode,
            legacyCountyId: county.legacyCountyId,
            name: county.name,
            shortLabel: county.shortLabel,
            region: county.region,
          },
          dataNotes: county.dataNotes,
          towns: county.towns,
        },
      })),
      countyBuckets: counties.map((county) => ({ fileName: toCountyBucketFile(county.id), detail: buildCountyBucketSlice(county) })),
      schoolCoordinateLookup: {
        generatedAt,
        schools: schoolCoordinateLookup,
      },
    }

}
