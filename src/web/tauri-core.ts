import { apiJson, guardarToken } from './api'

interface LoginResponse {
  autenticado: boolean
  usuario: string
  mensaje: string
  token?: string
}

export async function invoke<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  if (command === 'login_local') {
    const response = await apiJson<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        usuario: args.usuario,
        password: args.password,
      }),
    })
    if (response.token) guardarToken(response.token)
    return response as T
  }

  if (command === 'cambiar_password_local') {
    const response = await apiJson<{ message: string }>('/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        usuario: args.usuario,
        passwordActual: args.passwordActual,
        passwordNueva: args.passwordNueva,
      }),
    })
    return response.message as T
  }

  if (command === 'get_database_status') {
    return apiJson<T>('/backup/status')
  }

  throw new Error(`La función ${command} requiere un adaptador web específico.`)
}
