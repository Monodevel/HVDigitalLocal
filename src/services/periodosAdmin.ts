import { apiJson } from '../web/api'

export interface PeriodoAdmin {
  id: number
  nombre: string
  anio: number
  fecha_inicio: string
  fecha_termino: string
  estado: 'ABIERTO' | 'CERRADO'
  usuarios_seleccionado: number
}

function normalizarPeriodo(row: Record<string, unknown>): PeriodoAdmin {
  return {
    id: Number(row.id),
    nombre: String(row.nombre ?? ''),
    anio: Number(row.anio),
    fecha_inicio: String(row.fecha_inicio ?? ''),
    fecha_termino: String(row.fecha_termino ?? ''),
    estado: String(row.estado ?? '').toUpperCase() === 'ABIERTO' ? 'ABIERTO' : 'CERRADO',
    usuarios_seleccionado: Number(row.usuarios_seleccionado ?? 0),
  }
}

export async function listarPeriodosAdmin(): Promise<PeriodoAdmin[]> {
  const rows = await apiJson<Array<Record<string, unknown>>>('/admin/periodos')
  return rows.map(normalizarPeriodo)
}

export async function crearPeriodoAdmin(anioInicio: number): Promise<void> {
  await apiJson('/admin/periodos', {
    method: 'POST',
    body: JSON.stringify({ anioInicio }),
  })
}

export async function cambiarEstadoPeriodoAdmin(
  periodoGlobalId: number,
  estado: 'ABIERTO' | 'CERRADO',
): Promise<void> {
  await apiJson(`/admin/periodos/${periodoGlobalId}/estado`, {
    method: 'PUT',
    body: JSON.stringify({ estado }),
  })
}
