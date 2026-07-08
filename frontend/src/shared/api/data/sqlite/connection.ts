import { recordResourceLoad } from '../atlasLoadObservation'
import { assertBinaryDataResponse, buildDataAssetUrl } from '../dataAsset'

export const SQLITE_RESOURCE_KEY = 'sqlite:education-atlas.sqlite'

export type DatabaseHandle = {
  db: {
    exec: (sql: string, params?: unknown[]) => Array<{ columns: string[]; values: unknown[][] }>
  }
  bytes: number
}

export type LoadDatabaseOptions = {
  forceRefresh?: boolean
}

type SqlJsModule = {
  Database: new (data?: Uint8Array | ArrayLike<number>) => DatabaseHandle['db']
}

let sqlEnginePromise: Promise<SqlJsModule> | null = null
let databaseBytesPromise: Promise<Uint8Array> | null = null
let sqlDatabasePromise: Promise<DatabaseHandle> | null = null

export function getDatabaseUrl(forceRefresh = false) {
  return buildDataAssetUrl('education-atlas.sqlite', forceRefresh)
}

async function loadSqlEngine() {
  if (!sqlEnginePromise) {
    sqlEnginePromise = (async () => {
      const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
        import('sql.js'),
        import('sql.js/dist/sql-wasm.wasm?url'),
      ])

      return initSqlJs({ locateFile: () => wasmUrl }) as Promise<SqlJsModule>
    })().catch((error) => {
      sqlEnginePromise = null
      throw error
    })
  }

  return sqlEnginePromise
}

async function fetchDatabaseBytes(forceRefresh = false) {
  if (forceRefresh) {
    databaseBytesPromise = null
  }

  if (!databaseBytesPromise) {
    const url = getDatabaseUrl(forceRefresh)
    databaseBytesPromise = fetch(url, {
      cache: forceRefresh ? 'no-store' : 'default',
    })
      .then(async (response) => {
        await assertBinaryDataResponse(response, 'education-atlas.sqlite', url)

        const buffer = new Uint8Array(await response.arrayBuffer())
        recordResourceLoad({
          source: 'network',
          resourceKey: SQLITE_RESOURCE_KEY,
          bytes: buffer.byteLength,
        })
        return buffer
      })
      .catch((error) => {
        databaseBytesPromise = null
        throw error
      })
  }

  return databaseBytesPromise
}

export async function warmAtlasRuntime() {
  await Promise.allSettled([loadSqlEngine(), fetchDatabaseBytes(false)])
}

export async function loadDatabase(options: LoadDatabaseOptions = {}) {
  if (options.forceRefresh) {
    sqlDatabasePromise = null
    databaseBytesPromise = null
  }

  if (!sqlDatabasePromise) {
    sqlDatabasePromise = (async () => {
      const [SQL, buffer] = await Promise.all([
        loadSqlEngine(),
        fetchDatabaseBytes(options.forceRefresh),
      ])

      return {
        db: new SQL.Database(buffer),
        bytes: buffer.byteLength,
      }
    })().catch((error) => {
      sqlDatabasePromise = null
      throw error
    })
  }

  return sqlDatabasePromise
}

export function resetConnection() {
  sqlDatabasePromise = null
  databaseBytesPromise = null
}
