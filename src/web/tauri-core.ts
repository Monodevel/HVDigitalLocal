import { apiJson, guardarSesionWeb, guardarToken } from './api'

interface LoginResponse {
  autenticado: boolean
  usuario: string
  mensaje: string
  token?: string
  usuarioId?: number
  rol?: 'ADMIN' | 'CALIFICADOR'
  calificadorDirectoId?: number | null
  nombreMostrar?: string | null
}

export async function invoke<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  if (command === 'login_local') {
    const response = await apiJson<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario: args.usuario, password: args.password }),
    })
    if (response.token) guardarToken(response.token)
    if (response.usuarioId && response.rol) {
      guardarSesionWeb({
        usuarioId: response.usuarioId,
        usuario: response.usuario,
        rol: response.rol,
        calificadorDirectoId: response.calificadorDirectoId ?? null,
        nombreMostrar: response.nombreMostrar ?? null,
      })
    }
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

  if (command === 'get_database_status') return apiJson<T>('/backup/status')

  throw new Error(`La función ${command} requiere un adaptador web específico.`)
}
