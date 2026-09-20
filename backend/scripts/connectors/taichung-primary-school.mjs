import * as XLSX from 'xlsx'

export const TAICHUNG_PRIMARY_SCHOOL_SOURCE = {
  academicYear: 115,
  name: '臺中市所屬公立國小普通班班級數及人數統計表',
  publisher: '臺中市政府教育局國小教育科',
  url: 'https://tc.edu.tw/cms-file/69e1b0744fab8dd08f097696.ods',
}

function normalizeCell(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function getWorkbookRows(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  })
}

function getTextRows(rows) {
  return rows.map((row) => row.map(normalizeCell).filter(Boolean).join(' ')).filter(Boolean)
}

function isSchoolNamePlaceholder(value) {
  return /^校名[：:]/.test(value) && /[（(]\s*[）)]/.test(value)
}

function findSchoolDataRows(rows) {
  return rows.filter((row) => {
    const schoolName = normalizeCell(row[0])
    return schoolName.endsWith('國小') && !schoolName.includes('校名')
  })
}

export function inspectTaichungPrimarySchoolWorkbook(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const rows = getWorkbookRows(workbook)
  const textRows = getTextRows(rows)
  const schoolDataRows = findSchoolDataRows(rows)
  const title = textRows.find((row) => row.includes('臺中市') && row.includes('班級數及人數統計表')) ?? ''
  const notes = textRows.filter((row) => row.startsWith('註'))
  const isTemplate = textRows.some(isSchoolNamePlaceholder) && schoolDataRows.length === 0

  if (isTemplate) {
    return {
      status: 'source-not-published',
      title,
      sheetName: workbook.SheetNames[0],
      schoolRecordCount: 0,
      reason: '附件是供單一學校填報的空白調查表，未含全市各校彙整列。',
      evidence: notes.filter((note) => note.includes('填報') || note.includes('最終各校')),
    }
  }

  return {
    status: 'unsupported-layout',
    title,
    sheetName: workbook.SheetNames[0],
    schoolRecordCount: schoolDataRows.length,
    reason: '來源不是已知的空白表單，但尚未實作此版彙整表欄位解析。',
    evidence: notes,
  }
}

export async function probeTaichungPrimarySchoolSource(fetchImpl = fetch) {
  const response = await fetchImpl(TAICHUNG_PRIMARY_SCHOOL_SOURCE.url, {
    headers: { Accept: 'application/vnd.oasis.opendocument.spreadsheet,application/octet-stream;q=0.9,*/*;q=0.8' },
  })
  if (!response.ok) {
    throw new Error(`Unable to fetch Taichung source: ${response.status}`)
  }

  return {
    source: TAICHUNG_PRIMARY_SCHOOL_SOURCE,
    fetchedAt: new Date().toISOString(),
    ...inspectTaichungPrimarySchoolWorkbook(await response.arrayBuffer()),
  }
}
