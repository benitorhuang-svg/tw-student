import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = 'data';
const MANIFEST_FILE = path.join(DATA_DIR, 'manifest.json');
const SQLITE_FILE = path.join(DATA_DIR, 'education-atlas.sqlite');

function hashFile(file) {
  const buffer = fs.readFileSync(file);
  return 'sha256-' + crypto.createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
  const sqliteHash = hashFile(SQLITE_FILE);
  const sqliteSize = fs.statSync(SQLITE_FILE).size;

  manifest.assets = [
    {
      path: 'education-atlas.sqlite',
      assetGroup: 'sqlite',
      hash: sqliteHash,
      bytes: sqliteSize,
      dependsOnSchemaVersion: manifest.schemaVersion,
      critical: true
    }
  ];

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log('Manifest updated to only list the consolidated SQLite file.');
}

main().catch(console.error);
