declare module '*.wasm?url' {
  const src: string
  export default src
}

declare module 'sql.js' {
  export type SqlValue = number | string | Uint8Array | null
  export type QueryExecResult = { columns: string[]; values: SqlValue[][] }
  export type Statement = {
    bind: (values?: SqlValue[] | Record<string, SqlValue> | null) => boolean
    getColumnNames: () => string[]
    step: () => boolean
    get: () => SqlValue[]
    free: () => boolean
  }
  export type Database = {
    exec: (sql: string, params?: SqlValue[]) => QueryExecResult[]
    prepare: (sql: string) => Statement
    close: () => void
  }

  const initSqlJs: (config?: { locateFile?: (file: string) => string }) => Promise<{
    Database: new (data?: Uint8Array | ArrayLike<number>) => Database
  }>
  export default initSqlJs
}
