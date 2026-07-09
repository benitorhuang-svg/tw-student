import * as XLSX from 'xlsx'

function normalizeWorkbookCell(value) {
  return String(value ?? '').replace(/\r?\n/g, '').trim()
}

function hasWorkbookRowData(row) {
  return row.some((value) => normalizeWorkbookCell(value) !== '')
}

function isWorkbookSchoolCode(value) {
  return /^[0-9A-Z]{4,10}$/i.test(normalizeWorkbookCell(value))
}

function toWorkbookObjects(rows, headers, startIndex) {
  return rows
    .slice(startIndex)
    .filter(hasWorkbookRowData)
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])))
}

function findHeaderRowIndex(rows, requiredHeaders) {
  return rows.findIndex((row) => requiredHeaders.every((header) => row.some((value) => normalizeWorkbookCell(value) === header)))
}

function parseSimpleWorkbookRows(rows, requiredHeaders, aliases = {}) {
  const headerRowIndex = rows.findIndex((row) => {
    const normalizedRow = row.map((value) => aliases[normalizeWorkbookCell(value)] ?? normalizeWorkbookCell(value))
    return requiredHeaders.every((header) => normalizedRow.includes(header))
  })
  if (headerRowIndex < 0) {
    throw new Error(`Unable to locate workbook header row: ${requiredHeaders.join(', ')}`)
  }

  const headers = rows[headerRowIndex].map((value) => {
    const normalized = normalizeWorkbookCell(value)
    return aliases[normalized] ?? normalized
  })

  return toWorkbookObjects(rows, headers, headerRowIndex + 1)
}

function combineWorkbookHeaders(primaryRow, secondaryRow) {
  let lastPrimary = ''

  return primaryRow.map((value, index) => {
    const normalizedPrimary = normalizeWorkbookCell(value)
    if (normalizedPrimary) {
      lastPrimary = normalizedPrimary
    }

    const primary = normalizedPrimary || lastPrimary
    const secondary = normalizeWorkbookCell(secondaryRow[index])

    if (primary === '學生數' && secondary === '男') return '學生數男'
    if (primary === '學生數' && secondary === '女') return '學生數女'
    if (primary === '學生數' && secondary === '總計') return '學生數總計'

    if (!primary) return secondary
    if (!secondary) return primary
    return `${primary}${secondary}`
  })
}

function parseBase0WorkbookRows(rows) {
  const headerRowIndex = rows.findIndex((row, index) => {
    const nextRow = rows[index + 1] ?? []
    return row.some((value) => normalizeWorkbookCell(value) === '學校代碼')
      && row.some((value) => normalizeWorkbookCell(value) === '學生數')
      && nextRow.some((value) => normalizeWorkbookCell(value) === '男')
  })

  if (headerRowIndex >= 0) {
    const headers = combineWorkbookHeaders(rows[headerRowIndex], rows[headerRowIndex + 1] ?? [])
    return toWorkbookObjects(rows, headers, headerRowIndex + 2)
  }

  const legacyHeaderRowIndex = rows.findIndex((row, index) => {
    const nextRow = rows[index + 1] ?? []
    return normalizeWorkbookCell(row[14]) === '學生數' && normalizeWorkbookCell(nextRow[14]) === '總計'
  })

  if (legacyHeaderRowIndex < 0) {
    throw new Error('Unable to locate workbook multi-row header for base0')
  }

  return rows
    .slice(legacyHeaderRowIndex + 2)
    .filter((row) => hasWorkbookRowData(row) && isWorkbookSchoolCode(row[0]))
    .map((row) => ({
      學校代碼: row[0] ?? '',
      學校名稱: row[1] ?? '',
      縣市名稱: row[3] ?? '',
      學生數男: row[15] ?? '',
      學生數女: row[16] ?? '',
    }))
}

function parseHigheraWorkbookRows(rows) {
  const simpleHeaderRowIndex = rows.findIndex((row) => row.some((value) => normalizeWorkbookCell(value) === '二專學生數'))
  if (simpleHeaderRowIndex >= 0) {
    return parseSimpleWorkbookRows(rows, ['學校代碼', '學校名稱', '二專學生數'])
  }

  const fixedHeaderRowIndex = rows.findIndex((row) => normalizeWorkbookCell(row[16]) === '二專' && normalizeWorkbookCell(row[17]).startsWith('二技'))
  if (fixedHeaderRowIndex < 0) {
    throw new Error('Unable to locate workbook header row for highera')
  }

  return rows
    .slice(fixedHeaderRowIndex + 1)
    .filter((row) => hasWorkbookRowData(row) && isWorkbookSchoolCode(row[0]))
    .map((row) => ({
      學校代碼: row[0] ?? '',
      學校名稱: row[1] ?? '',
      二專學生數: row[16] ?? '',
      '二技(大學)學生數': row[17] ?? '',
    }))
}

function parseHigherrWorkbookRows(rows) {
  const simpleHeaderRowIndex = rows.findIndex((row) => row.some((value) => normalizeWorkbookCell(value) === '學生數學士'))
  if (simpleHeaderRowIndex >= 0) {
    return parseSimpleWorkbookRows(rows, ['學校代碼', '學校名稱', '學生數學士'])
  }

  const fixedHeaderRowIndex = rows.findIndex((row) => normalizeWorkbookCell(row[10]) === '學士' && normalizeWorkbookCell(row[11]) === '碩士' && normalizeWorkbookCell(row[12]) === '博士')
  if (fixedHeaderRowIndex < 0) {
    throw new Error('Unable to locate workbook header row for higherr')
  }

  return rows
    .slice(fixedHeaderRowIndex + 1)
    .filter((row) => hasWorkbookRowData(row) && isWorkbookSchoolCode(row[0]))
    .map((row) => ({
      學校代碼: row[0] ?? '',
      學校名稱: row[1] ?? '',
      學生數學士: row[10] ?? '',
      學生數碩士: row[11] ?? '',
      學生數博士: row[12] ?? '',
    }))
}

export function parseOfficialWorkbook(arrayBuffer, parserKey) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  })

  switch (parserKey) {
    case 'student':
      return parseSimpleWorkbookRows(rows, ['學校代碼', '學校名稱', '總計'])
    case 'highera':
    case 'highera1':
      return parseHigheraWorkbookRows(rows)
    case 'basec':
      return parseSimpleWorkbookRows(rows, ['學校代碼', '學校名稱', '1年級男學生數'], {
        '1年級男': '1年級男學生數',
        '1年級女': '1年級女學生數',
        '2年級男': '2年級男學生數',
        '2年級女': '2年級女學生數',
        '3年級男': '3年級男學生數',
        '3年級女': '3年級女學生數',
        '4年級男': '4年級男學生數',
        '4年級女': '4年級女學生數',
        '5年級男': '5年級男學生數',
        '5年級女': '5年級女學生數',
        '6年級男': '6年級男學生數',
        '6年級女': '6年級女學生數',
      })
    case 'basej':
      return parseSimpleWorkbookRows(rows, ['學校代碼', '學校名稱', '學生數7年級男'], {
        '7年級男': '學生數7年級男',
        '7年級女': '學生數7年級女',
        '8年級男': '學生數8年級男',
        '8年級女': '學生數8年級女',
        '9年級男': '學生數9年級男',
        '9年級女': '學生數9年級女',
      })
    case 'base0':
      return parseBase0WorkbookRows(rows)
    case 'higherr':
      return parseHigherrWorkbookRows(rows)
    case 'e1_new':
    case 'j1_new':
    case 'high':
    case 'u1_new':
    case 'u2_new':
    case 'u3_new':
      return parseSimpleWorkbookRows(rows, ['代碼', '學校名稱'])
    default:
      throw new Error(`Unsupported workbook parser: ${parserKey}`)
  }
}
