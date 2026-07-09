import path from 'node:path'
import { createRequire } from 'node:module'

import initSqlJs from 'sql.js'

import { ATLAS_SQLITE_SCHEMA } from './atlas-sqlite/schema.mjs'
import { freeAtlasSqliteStatements, prepareAtlasSqliteStatements } from './atlas-sqlite/statements.mjs'
import { writeAtlasSqliteDataset } from './atlas-sqlite/writers.mjs'

const require = createRequire(import.meta.url)
const sqlJsRoot = path.dirname(require.resolve('sql.js/dist/sql-wasm.wasm'))

export async function buildAtlasSqliteBuffer(datasetBundle, boundaries, options = {}) {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(sqlJsRoot, file),
  })
  const db = new SQL.Database()

  db.exec(ATLAS_SQLITE_SCHEMA)
  const statements = prepareAtlasSqliteStatements(db)

  try {
    db.exec('BEGIN')
    writeAtlasSqliteDataset(statements, datasetBundle, boundaries, options)
    db.exec('COMMIT')
    return db.export()
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  } finally {
    freeAtlasSqliteStatements(statements)
  }
}
