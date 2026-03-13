/*
Utility for preprocessing township/county boundary GeoJSON files.

Usage:
  node ./frontend/scripts/simplify-boundaries.mjs

The project keeps full‑resolution TopoJSON in `backend/data/`.  When building
front‑end assets we intentionally avoid shipping a single huge file, but it
never hurts to run a quick simplification to trim a few hundred KB from each
county slice and to prepare for future vector‑tile work.

Mapshaper must be installed (it's a dev dependency via `npm install mapshaper`).
This script is not wired into the build; run manually or add a task in
package.json if you want automation.
*/
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(process.cwd(), 'frontend', 'public', 'data');
const files = ['county-boundaries.geojson', 'township-boundaries.geojson'];

for (const file of files) {
  const input = path.join(DATA_DIR, file);
  if (!fs.existsSync(input)) continue;
  const output = path.join(DATA_DIR, file.replace('.geojson', '.simp.geojson'));
  console.log(`simplifying ${file} → ${path.basename(output)}`);
  try {
    execSync(`npx mapshaper "${input}" -simplify weighted 8% -o format=geojson "${output}"`, {
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('simplification failed', err);
  }
}

console.log('done');
