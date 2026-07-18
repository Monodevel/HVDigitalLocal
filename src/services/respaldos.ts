import { invoke } from '@tauri-apps/api/core'
import { confirm, open, save } from '@tauri-apps/plugin-dialog'

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

function backupFileName(): string {
  const now = new Date()
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ]

  return `HVDigital_Backup_${parts.join('')}.hvbk`
}

export async function obtenerEstadoBasesDatos(): Promise<DatabaseStatus[]> {
  return invoke<DatabaseStatus[]>('get_database_status')
}

export async function seleccionarYCrearRespaldo(): Promise<BackupResult | null> {
  const destination = await save({
    title: 'Guardar respaldo de HVDigital',
    defaultPath: backupFileName(),
    filters: [{ name: 'Respaldo HVDigital', extensions: ['hvbk'] }],
  })

  if (!destination) return null

  const path = destination.toLowerCase().endsWith('.hvbk')
    ? destination
    : `${destination}.hvbk`

  return invoke<BackupResult>('create_database_backup', {
    destinationPath: path,
  })
}

export async function seleccionarYRestaurarRespaldo(): Promise<RestoreResult | null> {
  const source = await open({
    title: 'Seleccionar respaldo de HVDigital',
    multiple: false,
    directory: false,
    filters: [{ name: 'Respaldo HVDigital', extensions: ['hvbk'] }],
  })

  if (!source || Array.isArray(source)) return null

  const accepted = await confirm(
    'La restauración reemplazará los datos locales actuales. HVDigital creará automáticamente un respaldo preventivo antes de continuar. ¿Desea restaurar el archivo seleccionado?',
    {
      title: 'Confirmar restauración',
      kind: 'warning',
      okLabel: 'Restaurar',
      cancelLabel: 'Cancelar',
    },
  )

  if (!accepted) return null

  return invoke<RestoreResult>('restore_database_backup', {
    sourcePath: source,
  })
}

export function formatearBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / (1024 ** index)

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function formatearFechaUnix(value: number | null | undefined): string {
  if (!value) return 'Sin información'

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value * 1000))
}
