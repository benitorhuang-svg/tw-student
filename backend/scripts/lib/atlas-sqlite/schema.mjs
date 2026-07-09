export const ATLAS_SQLITE_SCHEMA = `
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
      detail_bytes INTEGER NOT NULL,
      bucket_bytes INTEGER NOT NULL,
      township_bytes INTEGER NOT NULL,
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
    CREATE TABLE boundaries (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- 'county' or 'township'
      topology_json TEXT NOT NULL
    );
    CREATE INDEX idx_towns_county_id ON towns (county_id);
    CREATE INDEX idx_schools_county_id ON schools (county_id);
    CREATE INDEX idx_schools_township_id ON schools (township_id);
    CREATE INDEX idx_school_year_metrics_school_id ON school_year_metrics (school_id);
    CREATE INDEX idx_school_compositions_school_id ON school_compositions (school_id, year);
    CREATE INDEX idx_school_buckets_county_id ON school_buckets (county_id);
    CREATE INDEX idx_coordinate_issues_county_id ON coordinate_issues (county_id);
`
