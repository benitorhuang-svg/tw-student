import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

type SqlWorkerMessage =
  | { type: 'init'; url: string; forceRefresh: boolean }
  | { id: number; type: 'exec'; sql: string; params?: SqlValue[] }
type IncomingSqlWorkerMessage = {
  id?: number
  type?: SqlWorkerMessage['type']
  sql?: string
  params?: SqlValue[]
  url?: string
  forceRefresh?: boolean
}

let db: Database | null = null

const workerScope = self as unknown as {
  postMessage: (message: unknown) => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function initWorker(url: string) {
  try {
    const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl })

    // Fetch database with retry and timeout
    let response: Response | null = null
    let attempt = 0
    let lastError: unknown = null

    while (attempt < 3 && !response) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout

        response = await fetch(url, { signal: controller.signal })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Failed to fetch database: ${response.status} ${response.statusText}`)
        }
      } catch (err) {
        lastError = err
        attempt++
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)) // Exponential backoff
          response = null
        }
      }
    }

    if (!response) {
      throw lastError || new Error('Failed to fetch database after 3 attempts')
    }

    const buffer = await response.arrayBuffer()

    if (db) {
      try {
        db.close()
      } catch {
        // ignore
      }
    }

    db = new SQL.Database(new Uint8Array(buffer))
    workerScope.postMessage({ type: 'ready' })
  } catch (err: unknown) {
    console.error('sql.js worker init error:', err)
    workerScope.postMessage({ error: getErrorMessage(err) })
  }
}

async function execQuery(id: number, sql: string, params: SqlValue[] = []) {
  if (!db) throw new Error('Database not initialized')

  try {
    const stmt = db.prepare(sql)
    stmt.bind(params)

    const columns: string[] = stmt.getColumnNames()
    const rows: unknown[][] = []

    while (stmt.step()) {
      rows.push(stmt.get())
    }

    stmt.free()
    workerScope.postMessage({ id, result: [{ columns, values: rows }] })
  } catch (err: unknown) {
    workerScope.postMessage({ id, error: getErrorMessage(err) })
  }
}

self.addEventListener('message', (ev: MessageEvent) => {
  const data = ev.data as IncomingSqlWorkerMessage
  if (data.type === 'init' && data.url) {
    initWorker(data.url)
  } else if (data.type === 'exec' && data.id !== undefined && data.sql) {
    execQuery(data.id, data.sql, data.params).catch(err => {
      workerScope.postMessage({ id: data.id, error: getErrorMessage(err) })
    })
  }
})

export {}
