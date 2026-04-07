/*
Generate county/township vector tiles (.pbf) using tippecanoe.

Requirements:
  npm install -g tippecanoe
  (or use npx tippecanoe if installed as dependency)

Output:
  frontend/public/data/tiles/county/{z}/{x}/{y}.pbf
  frontend/public/data/tiles/township/{z}/{x}/{y}.pbf

By default we tile up to zoom 14; adjust -z parameter as needed.
*/
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.resolve(process.cwd(), 'frontend', 'public', 'data')
const OUT_DIR = path.join(DATA_DIR, 'tiles')

// ensure output directories exist
fs.mkdirSync(path.join(OUT_DIR, 'county'), { recursive: true })
fs.mkdirSync(path.join(OUT_DIR, 'township'), { recursive: true })

function run(command) {
  console.log(command)
  execSync(command, { stdio: 'inherit' })
}

// Convert topojson to geojson temporary files
const countyTopo = path.join(DATA_DIR, 'county-boundaries.topo.json')
const townshipTopo = path.join(DATA_DIR, 'township-boundaries.topo.json')
const countyGeo = path.join(DATA_DIR, 'county-boundaries.geojson')
const townshipGeo = path.join(DATA_DIR, 'township-boundaries.geojson')
try {
  run(`npx topojson-client -o ${countyGeo} ${countyTopo}`)
  run(`npx topojson-client -o ${townshipGeo} ${townshipTopo}`)
} catch {
  console.warn('failed to convert topojson; assume geojson already exists')
}

// generate tiles
run(
  `npx tippecanoe -o ${OUT_DIR}/county.mbtiles -Z5 -z14 --layer=county ${countyGeo}`,
)
run(
  `npx tippecanoe -o ${OUT_DIR}/township.mbtiles -Z5 -z14 --layer=township ${townshipGeo}`,
)

// export mbtiles to a directory of pbf files
run(`npx mbtiles -d ${OUT_DIR}/county.mbtiles ${OUT_DIR}/county`) // assumes mbtiles cli
run(`npx mbtiles -d ${OUT_DIR}/township.mbtiles ${OUT_DIR}/township`)

console.log('vector tile generation complete; serve /data/tiles as static files')
