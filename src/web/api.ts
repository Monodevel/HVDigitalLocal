const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const TOKEN_KEY = 'hvdigital.web.token'
const SESSION_KEY = 'hvdigital.web.session'

export interface SesionWeb {
  usuarioId: number
  usuario: string
  rol: 'ADMIN' | 'CALIFICADOR'
  calificadorDirectoId: number | null
  nombreMostrar?: string | null
}

export function guardarToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function obtenerToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function guardarSesionWeb(sesion: SesionWeb): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion))
}

export function obtenerSesionWeb(): SesionWeb | null {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as SesionWeb } catch { return null }
}

export function limpiarToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

export async function cerrarSesionWeb(): Promise<void> {
  try {
    if (obtenerToken()) await apiFetch('/auth/logout', { method: 'POST' })
  } finally {
    limpiarToken()
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const token = obtenerToken()

  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'same-origin',
  })

  if (response.status === 401) limpiarToken()
  return response
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init)
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.message || payload?.error || `Error HTTP ${response.status}`
    throw new Error(message)
  }

  return payload as T
}
