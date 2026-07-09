import { ACADEMIC_YEARS, CURRENT_YEAR, SUMMARY_EDUCATION_LEVELS, SUMMARY_MANAGEMENT_TYPES, summaryBucketKey } from '../refresh-helpers.mjs'

export function getMissingYears(yearlyStudents) {
  const observedYears = yearlyStudents.filter((entry) => entry.students > 0).map((entry) => entry.year)

  if (observedYears.length < 2) {
    return []
  }

  const firstObservedYear = Math.min(...observedYears)
  const lastObservedYear = Math.max(...observedYears)

  return ACADEMIC_YEARS.filter((year) => {
    if (year <= firstObservedYear || year >= lastObservedYear) {
      return false
    }

    return !yearlyStudents.some((entry) => entry.year === year && entry.students > 0)
  })
}

export function buildSchoolAnnotations(yearlyStudents) {
  const missingYears = getMissingYears(yearlyStudents)
  const latestStudents = yearlyStudents.at(-1)?.students ?? 0
  const historicalStudents = yearlyStudents.slice(0, -1).some((entry) => entry.students > 0)
  const dataNotes = []
  let status = '正常'

  if (missingYears.length > 0) {
    dataNotes.push({ type: '缺年度', message: `正式資料序列存在中段缺口：${missingYears.join('、')}`, severity: 'warning', years: missingYears })
  }

  if (latestStudents === 0 && historicalStudents) {
    status = '待確認'
    dataNotes.push({
      type: '異常值',
      message: `${CURRENT_YEAR} 學年學生數為 0，可能涉及停辦、整併或資料尚未更新。`,
      severity: 'warning',
      years: [CURRENT_YEAR],
    })
  }

  return { missingYears, dataNotes, status }
}

export function buildScopeNotes(schools, scopeName) {
  const schoolsWithMissingYears = schools.filter((school) => (school.missingYears?.length ?? 0) > 0)
  const schoolsPendingVerification = schools.filter((school) => school.status === '待確認')
  const dataNotes = []

  if (schoolsWithMissingYears.length > 0) {
    dataNotes.push({ type: '缺年度', message: `${scopeName} 有 ${schoolsWithMissingYears.length} 所學校存在年度缺漏。`, severity: 'warning' })
  }

  if (schoolsPendingVerification.length > 0) {
    dataNotes.push({
      type: '異常值',
      message: `${scopeName} 有 ${schoolsPendingVerification.length} 所學校最新學年學生數為 0，需留意停辦或整併可能。`,
      severity: 'info',
      years: [CURRENT_YEAR],
    })
  }

  return dataNotes
}

export function buildDatasetNotes(fallbackEntries) {
  if (fallbackEntries.length === 0) {
    return []
  }

  const byYear = new Map()
  fallbackEntries.forEach(({ requestedYear, level, fileName, sourceYear }) => {
    if (!byYear.has(requestedYear)) {
      byYear.set(requestedYear, new Map())
    }

    const yearEntries = byYear.get(requestedYear)
    if (!yearEntries.has(level)) {
      yearEntries.set(level, { sourceYears: new Set(), files: new Set() })
    }

    const levelEntry = yearEntries.get(level)
    levelEntry.sourceYears.add(sourceYear)
    levelEntry.files.add(fileName)
  })

  return [...byYear.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([year, levelEntries]) => {
      const levelSummary = [...levelEntries.entries()]
        .sort(([leftLevel], [rightLevel]) => SUMMARY_EDUCATION_LEVELS.indexOf(leftLevel) - SUMMARY_EDUCATION_LEVELS.indexOf(rightLevel))
        .map(([level, entry]) => {
          const files = [...entry.files].sort().join('、')
          const sourceYears = [...entry.sourceYears].sort((left, right) => right - left).join('、')
          return `${level}（${files} 沿用 ${sourceYears} 學年）`
        })
        .join('、')

      return {
        type: '其他',
        message: `${year} 學年度部分正式靜態檔尚未發布：${levelSummary}。因此這些學制目前會沿用前一年已發布的正式數列，畫面上的 ${year} 學年總數可能與前一年相同。`,
        severity: 'warning',
        years: [year],
      }
    })
}

function getStudentsForYear(school, year) {
  return school.yearlyStudents.find((entry) => entry.year === year)?.students ?? 0
}

export function buildSummarySeries(schools) {
  const summaries = {}
  for (const educationLevel of SUMMARY_EDUCATION_LEVELS) {
    for (const managementType of SUMMARY_MANAGEMENT_TYPES) {
      const filteredSchools = schools.filter((school) => {
        const matchesEducationLevel = educationLevel === '全部' || school.educationLevel === educationLevel
        const matchesManagementType = managementType === '全部' || school.managementType === managementType
        return matchesEducationLevel && matchesManagementType
      })

      summaries[summaryBucketKey(educationLevel, managementType)] = ACADEMIC_YEARS.map((year) => ({
        year,
        students: filteredSchools.reduce((sum, school) => sum + getStudentsForYear(school, year), 0),
        schools: filteredSchools.length,
      }))
    }
  }
  return summaries
}

function mergeCount(left, right) {
  if (left == null && right == null) return undefined
  return (left ?? 0) + (right ?? 0)
}

function mergeBands(existingBands = [], nextBands = []) {
  const mergedBands = new Map()
  for (const band of [...existingBands, ...nextBands]) {
    const key = `${band.category}:${band.id}`
    if (!mergedBands.has(key)) {
      mergedBands.set(key, { ...band })
      continue
    }

    const entry = mergedBands.get(key)
    entry.totalStudents += band.totalStudents ?? 0
    entry.maleStudents = mergeCount(entry.maleStudents, band.maleStudents)
    entry.femaleStudents = mergeCount(entry.femaleStudents, band.femaleStudents)
  }

  return [...mergedBands.values()]
}

export function mergeComposition(existingComposition, nextComposition) {
  if (!existingComposition) return nextComposition
  if (!nextComposition) return existingComposition

  return {
    totalStudents: (existingComposition.totalStudents ?? 0) + (nextComposition.totalStudents ?? 0),
    maleStudents: mergeCount(existingComposition.maleStudents, nextComposition.maleStudents),
    femaleStudents: mergeCount(existingComposition.femaleStudents, nextComposition.femaleStudents),
    bands: mergeBands(existingComposition.bands, nextComposition.bands),
  }
}

export function buildYearlyCompositions(entry) {
  return ACADEMIC_YEARS.map((year) => {
    const composition = entry.yearlyCompositions.get(year)
    if (composition) {
      return { year, ...composition }
    }

    return {
      year,
      totalStudents: entry.yearlyStudents.get(year) ?? 0,
      bands: [],
    }
  })
}
