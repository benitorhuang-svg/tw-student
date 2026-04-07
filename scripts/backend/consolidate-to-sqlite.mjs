import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';

const DATA_DIR = 'data';
const SQLITE_FILE = path.join(DATA_DIR, 'education-atlas.sqlite');
const REPORT_FILE = path.join(DATA_DIR, 'validation-report.json');
const GRADE_MAP_FILE = path.join(DATA_DIR, 'schema/grade-map.json');
const SUMMARY_FILE = path.join(DATA_DIR, 'education-summary.json');

async function main() {
  console.log('Consolidating existing JSON data into SQLite...');

  const sqliteBuffer = fs.readFileSync(SQLITE_FILE);
  const SQL = await initSqlJs();
  const db = new SQL.Database(sqliteBuffer);

  const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
  const gradeMap = JSON.parse(fs.readFileSync(GRADE_MAP_FILE, 'utf8'));
  const summaryDataset = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));

  db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', ['validationReport', JSON.stringify(report)]);
  db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', ['gradeMap', JSON.stringify(gradeMap)]);
  db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', ['summaryDataset', JSON.stringify(summaryDataset)]);

  const outputBuffer = Buffer.from(db.export());
  fs.writeFileSync(SQLITE_FILE, outputBuffer);

  console.log('Successfully consolidated metadata into education-atlas.sqlite');
}

main().catch(console.error);
