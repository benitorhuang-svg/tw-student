import { number, normalizeText } from './normalization.mjs'

function toBandRecord(id, label, category, maleStudents, femaleStudents, totalStudents = null) {
  const resolvedTotalStudents = totalStudents ?? ((maleStudents ?? 0) + (femaleStudents ?? 0))
  return {
    id,
    label,
    category,
    totalStudents: resolvedTotalStudents,
    ...(maleStudents != null ? { maleStudents } : {}),
    ...(femaleStudents != null ? { femaleStudents } : {}),
  }
}

function toCompositionRecord(maleStudents, femaleStudents, bands = [], totalStudents = null) {
  const resolvedTotalStudents = totalStudents ?? ((maleStudents ?? 0) + (femaleStudents ?? 0))
  return {
    totalStudents: resolvedTotalStudents,
    ...(maleStudents != null ? { maleStudents } : {}),
    ...(femaleStudents != null ? { femaleStudents } : {}),
    bands,
  }
}

function buildElementaryComposition(row) {
  const grades = [
    ['grade-1', '1年級', number(row['1年級男學生數']), number(row['1年級女學生數'])],
    ['grade-2', '2年級', number(row['2年級男學生數']), number(row['2年級女學生數'])],
    ['grade-3', '3年級', number(row['3年級男學生數']), number(row['3年級女學生數'])],
    ['grade-4', '4年級', number(row['4年級男學生數']), number(row['4年級女學生數'])],
    ['grade-5', '5年級', number(row['5年級男學生數']), number(row['5年級女學生數'])],
    ['grade-6', '6年級', number(row['6年級男學生數']), number(row['6年級女學生數'])],
  ]
  const maleStudents = grades.reduce((sum, [, , male]) => sum + male, 0)
  const femaleStudents = grades.reduce((sum, [, , , female]) => sum + female, 0)
  return toCompositionRecord(
    maleStudents,
    femaleStudents,
    grades.map(([id, label, male, female]) => toBandRecord(id, label, 'grade', male, female)),
  )
}

function buildJuniorComposition(row) {
  const grades = [
    ['grade-7', '7年級', number(row['學生數7年級男']), number(row['學生數7年級女'])],
    ['grade-8', '8年級', number(row['學生數8年級男']), number(row['學生數8年級女'])],
    ['grade-9', '9年級', number(row['學生數9年級男']), number(row['學生數9年級女'])],
  ]
  const maleStudents = grades.reduce((sum, [, , male]) => sum + male, 0)
  const femaleStudents = grades.reduce((sum, [, , , female]) => sum + female, 0)
  return toCompositionRecord(
    maleStudents,
    femaleStudents,
    grades.map(([id, label, male, female]) => toBandRecord(id, label, 'grade', male, female)),
  )
}

function buildHighComposition(row) {
  const maleStudents = number(row['學生數男'])
  const femaleStudents = number(row['學生數女'])
  return toCompositionRecord(maleStudents, femaleStudents, [])
}

function normalizeHigherLabel(value) {
  return normalizeText(value).replace(/^[A-Z0-9]+\s*/, '')
}

function buildHigherStudentComposition(row) {
  const maleStudents = number(row['男生計'])
  const femaleStudents = number(row['女生計'])
  const trackLabel = normalizeHigherLabel(row['日間∕進修別'])
  const degreeLabel = normalizeHigherLabel(row['等級別'])
  const label = [trackLabel, degreeLabel].filter(Boolean).join(' ')
  return toCompositionRecord(
    maleStudents,
    femaleStudents,
    [toBandRecord(`${trackLabel || 'track'}-${degreeLabel || 'degree'}`, label || '學制總計', 'degree', maleStudents, femaleStudents)],
    number(row['總計']),
  )
}

function buildHighera1Composition(row) {
  const shortCollegeStudents = number(row['二專學生數'])
  const twoYearTechStudents = number(row['二技(大學)學生數'])
  return toCompositionRecord(
    undefined,
    undefined,
    [
      toBandRecord('degree-2y-college', '二專', 'degree', undefined, undefined, shortCollegeStudents),
      toBandRecord('degree-2y-tech', '二技(大學)', 'degree', undefined, undefined, twoYearTechStudents),
    ],
    shortCollegeStudents + twoYearTechStudents,
  )
}

function buildHigherrComposition(row) {
  const bachelorStudents = number(row['學生數學士'])
  const masterStudents = number(row['學生數碩士'])
  const doctoralStudents = number(row['學生數博士'])
  return toCompositionRecord(
    undefined,
    undefined,
    [
      toBandRecord('degree-bachelor', '學士', 'degree', undefined, undefined, bachelorStudents),
      toBandRecord('degree-master', '碩士', 'degree', undefined, undefined, masterStudents),
      toBandRecord('degree-doctoral', '博士', 'degree', undefined, undefined, doctoralStudents),
    ],
    bachelorStudents + masterStudents + doctoralStudents,
  )
}

export const LEVEL_CONFIG = {
  國小: {
    pointLevel: '國民小學',
    directoryFiles: ['e1_new'],
    detailFile: 'basec',
    sumRow: (row) =>
      number(row['1年級男學生數']) +
      number(row['1年級女學生數']) +
      number(row['2年級男學生數']) +
      number(row['2年級女學生數']) +
      number(row['3年級男學生數']) +
      number(row['3年級女學生數']) +
      number(row['4年級男學生數']) +
      number(row['4年級女學生數']) +
      number(row['5年級男學生數']) +
      number(row['5年級女學生數']) +
      number(row['6年級男學生數']) +
      number(row['6年級女學生數']),
    breakdownRow: buildElementaryComposition,
  },
  國中: {
    pointLevel: '國民中學',
    directoryFiles: ['j1_new'],
    detailFile: 'basej',
    sumRow: (row) =>
      number(row['學生數7年級男']) +
      number(row['學生數7年級女']) +
      number(row['學生數8年級男']) +
      number(row['學生數8年級女']) +
      number(row['學生數9年級男']) +
      number(row['學生數9年級女']),
    breakdownRow: buildJuniorComposition,
  },
  高中職: {
    pointLevel: '高級中等學校',
    directoryFiles: ['high'],
    detailFile: 'base0',
    sumRow: (row) => number(row['學生數男']) + number(row['學生數女']),
    breakdownRow: buildHighComposition,
  },
  大專院校: {
    pointLevel: '大專校院',
    directoryFiles: ['u1_new', 'u2_new', 'u3_new'],
    detailFiles: [
      { name: 'student', sumRow: (row) => number(row['總計']), breakdownRow: buildHigherStudentComposition },
      { name: 'highera', sumRow: (row) => number(row['二專學生數']) + number(row['二技(大學)學生數']), breakdownRow: buildHighera1Composition },
      { name: 'higherr', sumRow: (row) => number(row['學生數學士']) + number(row['學生數碩士']) + number(row['學生數博士']), breakdownRow: buildHigherrComposition },
    ],
  },
}
