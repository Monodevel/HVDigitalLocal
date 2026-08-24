import { apiJson } from './api'

export interface QueryResult {
  rowsAffected: number
  lastInsertId?: number
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
    return apiJson<QueryResult>('/db/execute', {
      method: 'POST',
      body: JSON.stringify({ query, params: bindValues }),
    })
  }
}
