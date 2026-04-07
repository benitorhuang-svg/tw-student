declare module '*.wasm?url' {
  const src: string
  export default src
}

declare module 'sql.js' {
  const initSqlJs: (config?: { locateFile?: (file: string) => string }) => Promise<{
    Database: new (data?: Uint8Array) => {
      exec: (sql: string, params?: unknown[]) => Array<{ columns: string[]; values: unknown[][] }>
    }
  }>
  export default initSqlJs
}