import path from 'node:path'
import { createRequire } from 'node:module'

import initSqlJs from 'sql.js'

const require = createRequire(import.meta.url)
const sqlJsRoot = path.dirname(require.resolve('sql.js/dist/sql-wasm.wasm'))

function encodeJson(value) {
  return JSON.stringify(value ?? null)
}

function toSchoolRowId(school) {
  return `${school.code}:${school.educationLevel}`
}

function insertCountySummaryRows(statement, countyId, summaries) {
  Object.entries(summaries).forEach(([bucketKey, rows]) => {
    const [educationLevel, managementType] = bucketKey.split('|')
    rows.forEach((row) => {
      statement.run([countyId, row.year, educationLevel, managementType, row.students, row.schools])
    })
  })
}

function insertTownSummaryRows(statement, countyId, townId, summaries) {
  Object.entries(summaries).forEach(([bucketKey, rows]) => {
    const [educationLevel, managementType] = bucketKey.split('|')
    rows.forEach((row) => {
      statement.run([countyId, townId, row.year, educationLevel, managementType, row.students, row.schools])
    })
  })
}

export async function buildAtlasSqliteBuffer(datasetBundle) {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(sqlJsRoot, file),
  })
  const db = new SQL.Database()

  db.exec(`
    PRAGMA journal_mode = DELETE;
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE counties (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_label TEXT NOT NULL,
      region TEXT NOT NULL,
      detail_file TEXT NOT NULL,
      bucket_file TEXT NOT NULL,
      township_file TEXT NOT NULL,
      detail_bytes INTEGER NOT NULL,
      bucket_bytes INTEGER NOT NULL,
      township_bytes INTEGER NOT NULL,
      data_notes_json TEXT NOT NULL
    );
    CREATE TABLE towns (
      id TEXT PRIMARY KEY,
      county_id TEXT NOT NULL,
      name TEXT NOT NULL,
      data_notes_json TEXT NOT NULL
    );
    CREATE TABLE schools (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      county_id TEXT NOT NULL,
      township_id TEXT NOT NULL,
      education_level TEXT NOT NULL,
      management_type TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      website TEXT NOT NULL,
      profile_url TEXT,
      longitude REAL NOT NULL,
      latitude REAL NOT NULL,
      status TEXT,
      missing_years_json TEXT NOT NULL,
      data_notes_json TEXT NOT NULL
    );
    CREATE TABLE school_yearly_students (
      school_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      students INTEGER NOT NULL,
      PRIMARY KEY (school_id, year)
    );
    CREATE TABLE county_summaries (
      county_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      education_level TEXT NOT NULL,
      management_type TEXT NOT NULL,
      students INTEGER NOT NULL,
      schools INTEGER NOT NULL,
      PRIMARY KEY (county_id, year, education_level, management_type)
    );
    CREATE TABLE town_summaries (
      county_id TEXT NOT NULL,
      town_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      education_level TEXT NOT NULL,
      management_type TEXT NOT NULL,
      students INTEGER NOT NULL,
      schools INTEGER NOT NULL,
      PRIMARY KEY (town_id, year, education_level, management_type)
    );
    CREATE TABLE school_buckets (
      county_id TEXT NOT NULL,
      precision INTEGER NOT NULL,
      bucket_id TEXT NOT NULL,
      geohash TEXT NOT NULL,
      school_count INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      min_latitude REAL NOT NULL,
      max_latitude REAL NOT NULL,
      min_longitude REAL NOT NULL,
      max_longitude REAL NOT NULL,
      top_schools_json TEXT NOT NULL,
      PRIMARY KEY (county_id, precision, bucket_id)
    );
    CREATE TABLE summary_views (
      id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL
    );
    CREATE TABLE county_detail_views (
      county_id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL
    );
    CREATE TABLE county_bucket_views (
      county_id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL
    );
    CREATE INDEX idx_towns_county_id ON towns (county_id);
    CREATE INDEX idx_schools_county_id ON schools (county_id);
    CREATE INDEX idx_schools_township_id ON schools (township_id);
    CREATE INDEX idx_school_buckets_county_id ON school_buckets (county_id);
  `)

  const insertMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)')
  const insertCounty = db.prepare('INSERT INTO counties VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertTown = db.prepare('INSERT INTO towns VALUES (?, ?, ?, ?)')
  const insertSchool = db.prepare('INSERT INTO schools VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertYearly = db.prepare('INSERT INTO school_yearly_students VALUES (?, ?, ?)')
  const insertCountySummary = db.prepare('INSERT INTO county_summaries VALUES (?, ?, ?, ?, ?, ?)')
  const insertTownSummary = db.prepare('INSERT INTO town_summaries VALUES (?, ?, ?, ?, ?, ?, ?)')
  const insertBucket = db.prepare('INSERT INTO school_buckets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertSummaryView = db.prepare('INSERT INTO summary_views VALUES (?, ?)')
  const insertCountyDetailView = db.prepare('INSERT INTO county_detail_views VALUES (?, ?)')
  const insertCountyBucketView = db.prepare('INSERT INTO county_bucket_views VALUES (?, ?)')

  try {
    db.exec('BEGIN')

    insertMeta.run(['generatedAt', datasetBundle.generatedAt])
    insertMeta.run(['years', encodeJson(datasetBundle.years)])
    insertMeta.run(['sources', encodeJson(datasetBundle.sources)])

    datasetBundle.summaryDataset.counties.forEach((county) => {
      insertCounty.run([
        county.id,
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

      insertCountySummaryRows(insertCountySummary, county.id, county.summaries)

      county.towns.forEach((town) => {
        insertTown.run([
          town.id,
          county.id,
          town.name,
          encodeJson(town.dataNotes ?? []),
        ])
        insertTownSummaryRows(insertTownSummary, county.id, town.id, town.summaries)
      })
    })

    datasetBundle.countyDetails.forEach(({ detail }) => {
      detail.towns.forEach((town) => {
        town.schools.forEach((school) => {
          const schoolRowId = toSchoolRowId(school)
          insertSchool.run([
            schoolRowId,
            school.code,
            school.name,
            school.countyId,
            school.townshipId,
            school.educationLevel,
            school.managementType,
            school.address,
            school.phone,
            school.website,
            school.profileUrl ?? null,
            school.coordinates.longitude,
            school.coordinates.latitude,
            school.status ?? null,
            encodeJson(school.missingYears ?? []),
            encodeJson(school.dataNotes ?? []),
          ])
          school.yearlyStudents.forEach((entry) => {
            insertYearly.run([schoolRowId, entry.year, entry.students])
          })
        })
      })

      insertCountyDetailView.run([detail.county.id, encodeJson(detail)])
    })

    datasetBundle.countyBuckets.forEach(({ detail }) => {
      Object.entries(detail.precisions).forEach(([precision, buckets]) => {
        buckets.forEach((bucket) => {
          insertBucket.run([
            detail.county.id,
            Number(precision),
            bucket.id,
            bucket.geohash,
            bucket.count,
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

      insertCountyBucketView.run([detail.county.id, encodeJson(detail)])
    })

    insertSummaryView.run(['education-summary', encodeJson(datasetBundle.summaryDataset)])

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  } finally {
    insertMeta.free()
    insertCounty.free()
    insertTown.free()
    insertSchool.free()
    insertYearly.free()
    insertCountySummary.free()
    insertTownSummary.free()
    insertBucket.free()
    insertSummaryView.free()
    insertCountyDetailView.free()
    insertCountyBucketView.free()
  }

  return db.export()
}