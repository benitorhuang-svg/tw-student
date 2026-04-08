// SQL worker: loads sql.js and the sqlite database bytes, executes queries on demand
let SQL: any = null
let wasmUrl: string | null = null
let db: any = null

async function initWorker(buffer?: ArrayBuffer) {
  if (!SQL) {
    const [{ default: initSqlJs }, { default: wasm }] = await Promise.all([import('sql.js'), import('sql.js/dist/sql-wasm.wasm?url')])
    wasmUrl = wasm
    SQL = await initSqlJs({ locateFile: () => wasmUrl })
  }
  if (buffer && !db) {
    db = new SQL.Database(new Uint8Array(buffer))
    ;(self as any).postMessage({ type: 'ready' })
  }
}

self.addEventListener('message', async (ev: MessageEvent) => {
  const { id, type, sql, params, buffer } = ev.data || {}
  try {
    if (type === 'init') {
      await initWorker(buffer)
      return
    }
    if (type === 'exec') {
      if (!db && buffer) {
        await initWorker(buffer)
      }
      if (!db) throw new Error('Database not initialized')
      const res = db.exec(sql, params)
      ;(self as any).postMessage({ id, result: res })
      return
    }
  } catch (err) {
    ;(self as any).postMessage({ id, error: String(err && err.message ? err.message : err) })
  }
})

export {}
