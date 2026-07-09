const INSERT_SQL = {
  meta: 'INSERT INTO meta (key, value) VALUES (?, ?)',
  county: 'INSERT INTO counties VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  town: 'INSERT INTO towns VALUES (?, ?, ?, ?, ?)',
  school: 'INSERT INTO schools VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  yearMetric: 'INSERT INTO school_year_metrics VALUES (?, ?, ?, ?, ?, ?)',
  compositionSummary: 'INSERT INTO school_composition_summaries VALUES (?, ?, ?, ?, ?)',
  composition: 'INSERT INTO school_compositions VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  countySummary: 'INSERT INTO county_summaries VALUES (?, ?, ?, ?, ?, ?)',
  townSummary: 'INSERT INTO town_summaries VALUES (?, ?, ?, ?, ?, ?, ?)',
  bucket: 'INSERT INTO school_buckets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  boundary: 'INSERT INTO boundaries VALUES (?, ?, ?)',
  coordinateIssue: 'INSERT INTO coordinate_issues VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
}

export function prepareAtlasSqliteStatements(db) {
  return Object.fromEntries(
    Object.entries(INSERT_SQL).map(([key, sql]) => [key, db.prepare(sql)]),
  )
}

export function freeAtlasSqliteStatements(statements) {
  Object.values(statements).forEach((statement) => statement.free())
}
