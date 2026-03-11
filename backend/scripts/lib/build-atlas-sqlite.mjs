import path from 'node:path'
import { createRequire } from 'node:module'

import initSqlJs from 'sql.js'

const require = createRequire(import.meta.url)
const sqlJsRoot = path.dirname(require.resolve('sql.js/dist/sql-wasm.wasm'))

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

function insertCountySummaryRows(statement, countyCode, summaries) {
  Object.entries(summaries).forEach(([bucketKey, rows]) => {
    const [educationLevel, managementType] = bucketKey.split('|')
    rows.forEach((row) => {
      statement.run([countyCode, row.year, educationLevel, managementType, row.students, row.schools])
    })
  })
}

function insertTownSummaryRows(statement, countyCode, townCode, summaries) {
  Object.entries(summaries).forEach(([bucketKey, rows]) => {
    const [educationLevel, managementType] = bucketKey.split('|')
    rows.forEach((row) => {
      statement.run([countyCode, townCode, row.year, educationLevel, managementType, row.students, row.schools])
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
      legacy_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      short_label TEXT NOT NULL,
      region TEXT NOT NULL,
      detail_file TEXT NOT NULL,
      bucket_file TEXT NOT NULL,
      township_file TEXT NOT NULL,
      school_atlas_file TEXT NOT NULL,
      detail_bytes INTEGER NOT NULL,
      bucket_bytes INTEGER NOT NULL,
      township_bytes INTEGER NOT NULL,
      school_atlas_bytes INTEGER NOT NULL,
      data_notes_json TEXT NOT NULL
    );
    CREATE TABLE towns (
      id TEXT PRIMARY KEY,
      county_id TEXT NOT NULL,
      legacy_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      data_notes_json TEXT NOT NULL
    );
    CREATE TABLE schools (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      legacy_id TEXT NOT NULL,
      name TEXT NOT NULL,
      county_id TEXT NOT NULL,
      county_legacy_id TEXT NOT NULL,
      township_id TEXT NOT NULL,
      township_legacy_id TEXT NOT NULL,
      education_level TEXT NOT NULL,
      management_type TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      website TEXT NOT NULL,
      profile_url TEXT,
      longitude REAL NOT NULL,
      latitude REAL NOT NULL,
      coordinate_resolution TEXT,
      coordinate_match_type TEXT,
      coordinate_match_score REAL,
      status TEXT,
      missing_years_json TEXT NOT NULL,
      data_notes_json TEXT NOT NULL
    );
    CREATE TABLE school_year_metrics (
      school_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      students INTEGER NOT NULL,
      value_status TEXT NOT NULL,
      is_estimated INTEGER NOT NULL,
      is_missing INTEGER NOT NULL,
      PRIMARY KEY (school_id, year)
    );
    CREATE TABLE school_composition_summaries (
      school_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      total_students INTEGER NOT NULL,
      male_students INTEGER,
      female_students INTEGER,
      PRIMARY KEY (school_id, year)
    );
    CREATE TABLE school_compositions (
      school_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      band_id TEXT NOT NULL,
      band_label TEXT NOT NULL,
      category TEXT NOT NULL,
      total_students INTEGER NOT NULL,
      male_students INTEGER,
      female_students INTEGER,
      PRIMARY KEY (school_id, year, band_id)
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
      total_students INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      min_latitude REAL NOT NULL,
      max_latitude REAL NOT NULL,
      min_longitude REAL NOT NULL,
      max_longitude REAL NOT NULL,
      top_schools_json TEXT NOT NULL,
      PRIMARY KEY (county_id, precision, bucket_id)
    );
    CREATE TABLE coordinate_issues (
      code TEXT NOT NULL,
      school_level TEXT NOT NULL,
      school_name TEXT NOT NULL,
      county_id TEXT NOT NULL,
      county_legacy_id TEXT NOT NULL,
      township_id TEXT NOT NULL,
      township_legacy_id TEXT NOT NULL,
      address TEXT NOT NULL,
      longitude REAL,
      latitude REAL,
      coordinate_resolution TEXT,
      coordinate_match_type TEXT,
      coordinate_match_score REAL,
      PRIMARY KEY (code, school_level)
    );
    CREATE INDEX idx_towns_county_id ON towns (county_id);
    CREATE INDEX idx_schools_county_id ON schools (county_id);
    CREATE INDEX idx_schools_township_id ON schools (township_id);
    CREATE INDEX idx_school_year_metrics_school_id ON school_year_metrics (school_id);
    CREATE INDEX idx_school_compositions_school_id ON school_compositions (school_id, year);
    CREATE INDEX idx_school_buckets_county_id ON school_buckets (county_id);
    CREATE INDEX idx_coordinate_issues_county_id ON coordinate_issues (county_id);
  `)

  const insertMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)')
  const insertCounty = db.prepare('INSERT INTO counties VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertTown = db.prepare('INSERT INTO towns VALUES (?, ?, ?, ?, ?)')
  const insertSchool = db.prepare('INSERT INTO schools VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertYearMetric = db.prepare('INSERT INTO school_year_metrics VALUES (?, ?, ?, ?, ?, ?)')
  const insertCompositionSummary = db.prepare('INSERT INTO school_composition_summaries VALUES (?, ?, ?, ?, ?)')
  const insertComposition = db.prepare('INSERT INTO school_compositions VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  const insertCountySummary = db.prepare('INSERT INTO county_summaries VALUES (?, ?, ?, ?, ?, ?)')
  const insertTownSummary = db.prepare('INSERT INTO town_summaries VALUES (?, ?, ?, ?, ?, ?, ?)')
  const insertBucket = db.prepare('INSERT INTO school_buckets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertCoordinateIssue = db.prepare('INSERT INTO coordinate_issues VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')

  try {
    db.exec('BEGIN')

    insertMeta.run(['generatedAt', datasetBundle.generatedAt])
    insertMeta.run(['years', encodeJson(datasetBundle.years)])
    insertMeta.run(['sources', encodeJson(datasetBundle.sources)])

    datasetBundle.summaryDataset.counties.forEach((county) => {
      const countyCode = county.countyCode ?? county.id
      insertCounty.run([
        countyCode,
        county.legacyCountyId ?? county.id,
        county.name,
        county.shortLabel,
        county.region,
        county.detailFile,
        county.bucketFile,
        county.townshipFile,
        county.schoolAtlasFile,
        county.assetMetrics?.detailBytes ?? 0,
        county.assetMetrics?.bucketBytes ?? 0,
        county.assetMetrics?.townshipBytes ?? 0,
        county.assetMetrics?.schoolAtlasBytes ?? 0,
        encodeJson(county.dataNotes ?? []),
      ])

      insertCountySummaryRows(insertCountySummary, countyCode, county.summaries)

      county.towns.forEach((town) => {
        insertTown.run([
          town.townCode ?? town.id,
          countyCode,
          town.legacyTownshipId ?? town.id,
          town.name,
          encodeJson(town.dataNotes ?? []),
        ])
        insertTownSummaryRows(insertTownSummary, countyCode, town.townCode ?? town.id, town.summaries)
      })
    })

    datasetBundle.countyDetails.forEach(({ detail }) => {
      detail.towns.forEach((town) => {
        town.schools.forEach((school) => {
          const schoolRowId = toSchoolRowId(school)
          insertSchool.run([
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

          school.yearlyStudents.forEach((entry) => {
            const valueStatus = toYearMetricStatus(entry)
            insertYearMetric.run([
              schoolRowId,
              entry.year,
              entry.students,
              valueStatus,
              valueStatus === 'estimated' ? 1 : 0,
              valueStatus === 'missing' ? 1 : 0,
            ])
          })

          ;(school.studentCompositions ?? []).forEach((composition) => {
            insertCompositionSummary.run([
              schoolRowId,
              composition.year,
              composition.totalStudents,
              composition.maleStudents ?? null,
              composition.femaleStudents ?? null,
            ])

            ;(composition.bands ?? []).forEach((band) => {
              insertComposition.run([
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
        })
      })
    })

    datasetBundle.countyBuckets.forEach(({ detail }) => {
      Object.entries(detail.precisions).forEach(([precision, buckets]) => {
        buckets.forEach((bucket) => {
          insertBucket.run([
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

    ;(datasetBundle.summaryDataset.missingCoordinates ?? []).forEach((entry) => {
      insertCoordinateIssue.run([
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

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  } finally {
    insertMeta.free()
    insertCounty.free()
    insertTown.free()
    insertSchool.free()
    insertYearMetric.free()
    insertCompositionSummary.free()
    insertComposition.free()
    insertCountySummary.free()
    insertTownSummary.free()
    insertBucket.free()
    insertCoordinateIssue.free()
  }

  return db.export()
}