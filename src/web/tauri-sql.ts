import { apiJson } from './api'

export interface QueryResult {
  rowsAffected: number
  lastInsertId?: number
}

function sentencias(query: string): string[] {
  return query
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)
}

export default class Database {
  static async load(_url: string): Promise<Database> {
    return new Database()
  }

  async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
    return apiJson<T>('/db/select', {
      method: 'POST',
      body: JSON.stringify({ query, params: bindValues }),
    })
  }

  async execute(query: string, bindValues: unknown[] = []): Promise<QueryResult> {
    const normalizada = query.trim().toUpperCase()

    // Estas PRAGMA son propias del cliente SQLite de Tauri. En la edición web
    // el servidor aplica WAL, foreign_keys y busy_timeout a cada conexión.
    if (normalizada.startsWith('PRAGMA')) {
      return { rowsAffected: 0 }
    }

    const lote = bindValues.length === 0 ? sentencias(query) : [query]
    if (lote.length > 1) {
      let total = 0
      let lastInsertId: number | undefined
      for (const sentencia of lote) {
        const resultado = await this.execute(sentencia)
        total += resultado.rowsAffected
        if (resultado.lastInsertId !== undefined) lastInsertId = resultado.lastInsertId
      }
      return { rowsAffected: total, lastInsertId }
    }

    return apiJson<QueryResult>('/db/execute', {
      method: 'POST',
      body: JSON.stringify({ query, params: bindValues }),
    })
  }
}
