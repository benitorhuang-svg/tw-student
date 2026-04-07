function toSample(entry) {
  return Object.fromEntries(Object.entries(entry).filter(([, value]) => value != null && value !== ''))
}

function countSeverity(items, severity) {
  return items.filter((item) => item.severity === severity && item.status !== 'pass').length
}

export function summarizeValidationReport(report) {
  return {
    overallStatus: report.overallStatus,
    blockingCount: countSeverity(report.items, 'blocking'),
    warningCount: countSeverity(report.items, 'warning'),
    infoCount: countSeverity(report.items, 'info'),
  }
}

function buildCountySummaryParityItem(datasetBundle) {
  const mismatches = []

  datasetBundle.summaryDataset.counties.forEach((county) => {
    const detail = datasetBundle.countyDetails.find((entry) => entry.detail.county.id === county.id)?.detail
    if (!detail) {
      mismatches.push({ countyId: county.id, issue: 'missing-county-detail' })
      return
    }

    const summaryRows = county.summaries['全部|全部'] ?? []
    summaryRows.forEach((row) => {
      const detailStudents = detail.towns.reduce((countySum, town) => (
        countySum + town.schools.reduce((schoolSum, school) => (
          schoolSum + (school.yearlyStudents.find((entry) => entry.year === row.year)?.students ?? 0)
        ), 0)
      ), 0)
      const detailSchools = detail.towns.reduce((countySum, town) => countySum + town.schools.length, 0)

      if (detailStudents !== row.students || detailSchools !== row.schools) {
        mismatches.push({
          countyId: county.id,
          year: row.year,
          summaryStudents: row.students,
          detailStudents,
          summarySchools: row.schools,
          detailSchools,
        })
      }
    })
  })

  return {
    ruleId: 'county-summary-parity',
    severity: 'blocking',
    status: mismatches.length > 0 ? 'fail' : 'pass',
    scope: 'summary',
    affectedAssets: ['education-summary.json'],
    affectedRecordCount: mismatches.length,
    samples: mismatches.slice(0, 5).map(toSample),
    recommendedAction: mismatches.length > 0 ? '檢查 summary 聚合與縣市 detail 切片是否來自同一批資料。' : 'none',
  }
}

function buildSchoolIdentityItem(datasetBundle) {
  const schoolIdCounts = new Map()
  const schoolLevelCounts = new Map()

  datasetBundle.countyDetails.forEach(({ detail }) => {
    detail.towns.forEach((town) => {
      town.schools.forEach((school) => {
        schoolIdCounts.set(school.id, (schoolIdCounts.get(school.id) ?? 0) + 1)
        const levelKey = `${school.code}:${school.educationLevel}`
        schoolLevelCounts.set(levelKey, (schoolLevelCounts.get(levelKey) ?? 0) + 1)
      })
    })
  })

  const duplicatedIds = [...schoolIdCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([schoolId, count]) => ({ schoolId, count }))
  const duplicatedLevels = [...schoolLevelCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([schoolLevelId, count]) => ({ schoolLevelId, count }))

  const duplicates = duplicatedIds.length > 0 ? duplicatedIds : duplicatedLevels

  return {
    ruleId: 'school-level-identity-unique',
    severity: 'blocking',
    status: duplicates.length > 0 ? 'fail' : 'pass',
    scope: 'schools',
    affectedAssets: datasetBundle.countyDetails.map((entry) => `counties/${entry.fileName}`),
    affectedRecordCount: duplicates.length,
    samples: duplicates.slice(0, 5).map(toSample),
    recommendedAction: duplicates.length > 0 ? '檢查 school id 與 school_code:educationLevel 是否仍有重複覆寫。' : 'none',
  }
}

function buildCompositionParityItem(datasetBundle) {
  const mismatches = []

  datasetBundle.countyDetails.forEach(({ detail }) => {
    detail.towns.forEach((town) => {
      town.schools.forEach((school) => {
        school.studentCompositions?.forEach((composition) => {
          const yearlyStudents = school.yearlyStudents.find((entry) => entry.year === composition.year)?.students ?? 0
          const bandStudents = composition.bands.reduce((sum, band) => sum + (band.totalStudents ?? 0), 0)
          if (composition.totalStudents !== yearlyStudents || (composition.bands.length > 0 && bandStudents !== composition.totalStudents)) {
            mismatches.push({
              schoolId: school.id,
              year: composition.year,
              totalStudents: composition.totalStudents,
              yearlyStudents,
              bandStudents,
            })
          }
        })
      })
    })
  })

  return {
    ruleId: 'student-composition-parity',
    severity: 'blocking',
    status: mismatches.length > 0 ? 'fail' : 'pass',
    scope: 'schools',
    affectedAssets: datasetBundle.countyDetails.map((entry) => `counties/${entry.fileName}`),
    affectedRecordCount: mismatches.length,
    samples: mismatches.slice(0, 5).map(toSample),
    recommendedAction: mismatches.length > 0 ? '檢查 yearlyStudents 與 studentCompositions 的 band 聚合邏輯。' : 'none',
  }
}

function buildMissingCoordinatesItem(datasetBundle) {
  const unresolvedEntries = (datasetBundle.summaryDataset.missingCoordinates ?? [])
    .filter((entry) => entry.coordinateResolution === '鄉鎮近似值')

  const samples = unresolvedEntries.slice(0, 5).map((entry) => toSample({
    school_code: entry.code,
    county: entry.county,
    township: entry.township,
    resolution: entry.coordinateResolution,
  }))

  return {
    ruleId: 'missing-coordinates',
    severity: 'warning',
    status: samples.length > 0 ? 'warning' : 'pass',
    scope: 'summary',
    affectedAssets: ['education-summary.json'],
    affectedRecordCount: unresolvedEntries.length,
    samples,
    recommendedAction: samples.length > 0 ? '檢查 GIS 點位、人工補點或地址解點結果。' : 'none',
  }
}

function buildBoundaryCoverageItem(datasetBundle, boundaries) {
  const countyCodes = new Set(Object.values(boundaries.countyCoordinateLookup).map((entry) => entry.countyCode))
  const townCodes = new Set(Object.values(boundaries.townshipCoordinateLookup).map((entry) => entry.townCode))
  const missing = []

  datasetBundle.summaryDataset.counties.forEach((county) => {
    if (!county.countyCode || !countyCodes.has(county.countyCode)) {
      missing.push({ scopeType: 'county', id: county.id, countyCode: county.countyCode ?? null })
    }
    county.towns.forEach((town) => {
      if (!town.townCode || !townCodes.has(town.townCode)) {
        missing.push({
          scopeType: 'township',
          id: town.id,
          countyId: county.id,
          countyCode: county.countyCode ?? null,
          townCode: town.townCode ?? null,
        })
      }
    })
  })

  return {
    ruleId: 'boundary-coverage-match',
    severity: 'blocking',
    status: missing.length > 0 ? 'fail' : 'pass',
    scope: 'boundaries',
    affectedAssets: ['county-boundaries.topo.json', ...boundaries.townshipTopologyByCounty.map((entry) => entry.fileName)],
    affectedRecordCount: missing.length,
    samples: missing.slice(0, 5).map(toSample),
    recommendedAction: missing.length > 0 ? '檢查 summary 中的 countyCode/townCode 是否仍可對應到 boundary 切片。' : 'none',
  }
}

function buildAssetInventoryItem(assetDrafts) {
  return {
    ruleId: 'asset-inventory-generated',
    severity: 'info',
    status: 'pass',
    scope: 'manifest',
    affectedAssets: assetDrafts.map((entry) => entry.path),
    affectedRecordCount: assetDrafts.length,
    recommendedAction: 'none',
  }
}

export function buildValidationReport({ generatedAt, schemaVersion, datasetBundle, boundaries, assetDrafts }) {
  const items = [
    buildSchoolIdentityItem(datasetBundle),
    buildCountySummaryParityItem(datasetBundle),
    buildCompositionParityItem(datasetBundle),
    buildBoundaryCoverageItem(datasetBundle, boundaries),
    buildMissingCoordinatesItem(datasetBundle),
    buildAssetInventoryItem(assetDrafts),
  ]

  const overallStatus = items.some((item) => item.severity === 'blocking' && item.status === 'fail')
    ? 'fail'
    : items.some((item) => item.status === 'warning')
      ? 'warning'
      : 'pass'

  return {
    generatedAt,
    schemaVersion,
    overallStatus,
    items,
  }
}
