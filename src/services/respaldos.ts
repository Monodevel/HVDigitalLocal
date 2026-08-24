import { apiFetch, apiJson } from '../web/api'

export interface DatabaseStatus {
  name: string
  path: string
  exists: boolean
  sizeBytes: number
  modifiedUnix: number | null
}

export interface BackupResult {
  path: string
  createdUnix: number
  databases: string[]
  sizeBytes: number
}

export interface RestoreResult {
  sourcePath: string
  safetyBackupPath: string
  restoredDatabases: string[]
  restoredUnix: number
}

function elegirArchivo(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.sql,.sql.gz,application/sql,text/plain,application/octet-stream'
    input.style.display = 'none'
    input.addEventListener('change', () => {
      resolve(input.files?.[0] ?? null)
      input.remove()
    }, { once: true })
    document.body.appendChild(input)
    input.click()
  })
}

export async function obtenerEstadoBasesDatos(): Promise<DatabaseStatus[]> {
  return apiJson<DatabaseStatus[]>('/backup/status')
}

export async function seleccionarYCrearRespaldo(): Promise<BackupResult | null> {
  const response = await apiFetch('/backup/download')
  if (!response.ok) throw new Error(await response.text())

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="?([^";]+)"?/i)
  const filename = match?.[1] || `HVDigital_MariaDB_${Date.now()}.sql`

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  return {
    path: filename,
    createdUnix: Math.floor(Date.now() / 1000),
    databases: ['MariaDB · hvdigital'],
    sizeBytes: blob.size,
  }
}

export async function seleccionarYRestaurarRespaldo(): Promise<RestoreResult | null> {
  const file = await elegirArchivo()
  if (!file) return null

  const accepted = window.confirm(
    'La restauración reemplazará la base MariaDB central actual. HVDigital generará primero un respaldo preventivo en el servidor. ¿Desea continuar?',
  )
  if (!accepted) return null

  const form = new FormData()
  form.append('file', file, file.name)
  return apiJson<RestoreResult>('/backup/restore', { method: 'POST', body: form })
}

export function formatearBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / (1024 ** index)
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatearFechaUnix(value: number | null | undefined): string {
  if (!value) return 'Administrado por MariaDB'
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value * 1000))
}
