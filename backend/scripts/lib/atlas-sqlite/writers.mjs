function encodeJson(value) {
  return JSON.stringify(value ?? null)
}

function toSchoolRowId(school) {
  return school.schoolLevelId ?? `${school.code}:${school.educationLevel}`
}

function toYearMetricStatus(entry) {
  if (entry?.valueStatus) return entry.valueStatus
  if (entry?.isMissing) return 'missing'
  if (entry?.isEstimated) return 'estimated'
  return entry?.students === 0 ? 'zero' : 'official'
}

function writeMetaRows(statements, datasetBundle, boundaries, { validationReport, gradeMap } = {}) {
  statements.meta.run(['generatedAt', datasetBundle.generatedAt])
  statements.meta.run(['years', encodeJson(datasetBundle.years)])
  statements.meta.run(['sources', encodeJson(datasetBundle.sources)])
  statements.meta.run(['dataNotes', encodeJson(datasetBundle.summaryDataset.dataNotes ?? [])])

  if (validationReport) {
    statements.meta.run(['validationReport', encodeJson(validationReport)])
  }
  if (gradeMap) {
    statements.meta.run(['gradeMap', encodeJson(gradeMap)])
  }

  statements.meta.run(['summaryDataset', encodeJson(datasetBundle.summaryDataset)])
  statements.meta.run(['areaCoordinateLookup', encodeJson({
    generatedAt: datasetBundle.summaryDataset.generatedAt,
    counties: boundaries.countyCoordinateLookup,
    townships: boundaries.townshipCoordinateLookup,
  })])
  statements.meta.run(['schoolCoordinateLookup', encodeJson(datasetBundle.schoolCoordinateLookup)])
}

function writeSummaryRows(statement, leadingValues, summaries) {
  Object.entries(summaries).forEach(([bucketKey, rows]) => {
    const [educationLevel, managementType] = bucketKey.split('|')
    rows.forEach((row) => {
      statement.run([...leadingValues, row.year, educationLevel, managementType, row.students, row.schools])
    })
  })
}

function writeAdministrativeRows(statements, datasetBundle, boundaries) {
  statements.boundary.run(['counties', 'county', encodeJson(boundaries.countyTopology)])

  datasetBundle.summaryDataset.counties.forEach((county) => {
    const countyCode = county.countyCode ?? county.id
    statements.county.run([
      countyCode,
      county.legacyCountyId ?? county.id,
      county.name,
      county.shortLabel,
      county.region,
      county.detailFile,
      county.bucketFile,
      county.townshipFile,
      county.assetMetrics?.detailBytes ?? 0,
      county.assetMetrics?.bucketBytes ?? 0,
      county.assetMetrics?.townshipBytes ?? 0,
      encodeJson(county.dataNotes ?? []),
    ])

    writeSummaryRows(statements.countySummary, [countyCode], county.summaries)

    county.towns.forEach((town) => {
      const townCode = town.townCode ?? town.id
      statements.town.run([
        townCode,
        countyCode,
        town.legacyTownshipId ?? town.id,
        town.name,
        encodeJson(town.dataNotes ?? []),
      ])
      writeSummaryRows(statements.townSummary, [countyCode, townCode], town.summaries)
    })

    const townshipTopology = boundaries.townshipTopologyByCounty.find((entry) => entry.countyId === county.id)
    if (townshipTopology) {
      statements.boundary.run([county.id, 'township', encodeJson(townshipTopology.topology)])
    }
  })
}

function writeSchoolRows(statements, datasetBundle) {
  datasetBundle.countyDetails.forEach(({ detail }) => {
    detail.towns.forEach((town) => {
      town.schools.forEach((school) => {
        const schoolRowId = toSchoolRowId(school)
        statements.school.run([
          schoolRowId,
          school.code,
          school.id,
          school.name,
          school.countyCode ?? detail.county.countyCode ?? school.countyId,
          school.legacyCountyId ?? school.countyId,
          school.townCode ?? school.townshipId,
          school.legacyTownshipId ?? school.townshipId,
          school.educationLevel,
          school.managementType,
          school.address,
          school.phone,
          school.website,
          school.profileUrl ?? null,
          school.coordinates.longitude,
          school.coordinates.latitude,
          school._missingCoordinateEntry?.coordinateResolution ?? null,
          school._missingCoordinateEntry?.coordinateMatchType ?? null,
          school._missingCoordinateEntry?.coordinateMatchScore ?? null,
          school.status ?? null,
          encodeJson(school.missingYears ?? []),
          encodeJson(school.dataNotes ?? []),
        ])

        writeSchoolMetricRows(statements, schoolRowId, school)
        writeSchoolCompositionRows(statements, schoolRowId, school)
      })
    })
  })
}

function writeSchoolMetricRows(statements, schoolRowId, school) {
  school.yearlyStudents.forEach((entry) => {
    const valueStatus = toYearMetricStatus(entry)
    statements.yearMetric.run([
      schoolRowId,
      entry.year,
      entry.students,
      valueStatus,
      valueStatus === 'estimated' ? 1 : 0,
      valueStatus === 'missing' ? 1 : 0,
    ])
  })
}

function writeSchoolCompositionRows(statements, schoolRowId, school) {
  ;(school.studentCompositions ?? []).forEach((composition) => {
    statements.compositionSummary.run([
      schoolRowId,
      composition.year,
      composition.totalStudents,
      composition.maleStudents ?? null,
      composition.femaleStudents ?? null,
    ])

    ;(composition.bands ?? []).forEach((band) => {
      statements.composition.run([
        schoolRowId,
        composition.year,
        band.id,
        band.label,
        band.category,
        band.totalStudents,
        band.maleStudents ?? null,
        band.femaleStudents ?? null,
      ])
    })
  })
}

function writeBucketRows(statements, datasetBundle) {
  datasetBundle.countyBuckets.forEach(({ detail }) => {
    Object.entries(detail.precisions).forEach(([precision, buckets]) => {
      buckets.forEach((bucket) => {
        statements.bucket.run([
          detail.county.countyCode ?? detail.county.id,
          Number(precision),
          bucket.id,
          bucket.geohash,
          bucket.count,
          bucket.totalStudents,
          bucket.latitude,
          bucket.longitude,
          bucket.bounds.minLatitude,
          bucket.bounds.maxLatitude,
          bucket.bounds.minLongitude,
          bucket.bounds.maxLongitude,
          encodeJson(bucket.topSchools),
        ])
      })
    })
  })
}

function writeCoordinateIssueRows(statements, datasetBundle) {
  ;(datasetBundle.summaryDataset.missingCoordinates ?? []).forEach((entry) => {
    statements.coordinateIssue.run([
      entry.code,
      entry.level,
      entry.name,
      entry.countyCode ?? entry.county,
      entry.county,
      entry.townCode ?? `${entry.countyCode ?? entry.county}:${entry.township}`,
      `${entry.county}:${entry.township}`,
      entry.address ?? '',
      entry.longitude ?? null,
      entry.latitude ?? null,
      entry.coordinateResolution ?? null,
      entry.coordinateMatchType ?? null,
      entry.coordinateMatchScore ?? null,
    ])
  })
}

export function writeAtlasSqliteDataset(statements, datasetBundle, boundaries, options = {}) {
  writeMetaRows(statements, datasetBundle, boundaries, options)
  writeAdministrativeRows(statements, datasetBundle, boundaries)
  writeSchoolRows(statements, datasetBundle)
  writeBucketRows(statements, datasetBundle)
  writeCoordinateIssueRows(statements, datasetBundle)
}
