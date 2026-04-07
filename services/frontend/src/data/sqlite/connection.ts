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

let sqlDatabasePromise: Promise<DatabaseHandle> | null = null

export function getDatabaseUrl(forceRefresh = false) {
  return buildDataAssetUrl('education-atlas.sqlite', forceRefresh)
}

export async function loadDatabase(options: LoadDatabaseOptions = {}) {
  if (options.forceRefresh) {
    sqlDatabasePromise = null
  }

  if (!sqlDatabasePromise) {
    sqlDatabasePromise = (async () => {
      const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
        import('sql.js'),
        import('sql.js/dist/sql-wasm.wasm?url'),
      ])
      const SQL = await initSqlJs({ locateFile: () => wasmUrl })
      const url = getDatabaseUrl(options.forceRefresh)
      const response = await fetch(url, {
        cache: options.forceRefresh ? 'no-store' : 'default',
      })
      await assertBinaryDataResponse(response, 'education-atlas.sqlite', url)

      const buffer = new Uint8Array(await response.arrayBuffer())
      recordResourceLoad({
        source: 'network',
        resourceKey: SQLITE_RESOURCE_KEY,
        bytes: buffer.byteLength,
      })

      return {
        db: new SQL.Database(buffer),
        bytes: buffer.byteLength,
      }
    })()
  }

  return sqlDatabasePromise
}

export function resetConnection() {
  sqlDatabasePromise = null
}
