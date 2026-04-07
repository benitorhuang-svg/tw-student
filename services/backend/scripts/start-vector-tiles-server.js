#!/usr/bin/env node
// Simple static tile server for vector tiles directory.
// Usage: node services/backend/scripts/start-vector-tiles-server.js [port] [tilesDir]

const express = require('express')
const path = require('path')
const fs = require('fs')

const port = process.argv[2] || 8080
const tilesDir = process.argv[3] || path.resolve(__dirname, '../../../data', 'tiles')

const app = express()

// ensure tile dir exists
if (!fs.existsSync(tilesDir)) {
  console.error('tiles directory not found:', tilesDir)
  process.exit(1)
}

// serve pbf with correct content type
app.use('/tiles', express.static(tilesDir, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.pbf')) {
      res.set('Content-Type', 'application/x-protobuf')
      res.set('Content-Encoding', 'gzip')
    }
  }
}))

app.listen(port, () => {
  console.log(`vector tile server running at http://localhost:${port}/tiles`)
})
