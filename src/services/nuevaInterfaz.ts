import { apiJson } from '../web/api'

export type PeriodoUi = {
  id: number
  globalId: number
  nombre: string
  estado: 'ABIERTO' | 'CERRADO'
  fechaInicio: string
  fechaTermino: string
}

export type CalificadoUi = {
  id: number
  personaId: number
  expedienteId: number
  hojaVidaId: number | null
  grado: string
  nombre: string
  run: string
  unidad: string
  estado: 'ACTIVO' | 'INACTIVO'
}

function fechaVisual(fecha: string | null): string {
  if (!fecha) return 'Sin fecha'
  const partes = fecha.slice(0, 10).split('-')
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fecha
}

export async function listarPeriodosUi(): Promise<PeriodoUi[]> {
  const filas = await apiJson<Array<{
    id: number
    periodo_global_id: number | null
    nombre: string | null
    anio: number | null
    fecha_inicio: string | null
    fecha_termino: string | null
    estado: string | null
  }>>('/periodos')

  return filas.map(fila => ({
    id: Number(fila.id),
    globalId: Number(fila.periodo_global_id ?? fila.id),
    nombre: fila.nombre || (fila.anio ? `Período ${fila.anio}–${fila.anio + 1}` : `Período ${fila.id}`),
    estado: String(fila.estado ?? 'cerrado').toUpperCase() === 'ABIERTO' ? 'ABIERTO' : 'CERRADO',
    fechaInicio: fechaVisual(fila.fecha_inicio),
    fechaTermino: fechaVisual(fila.fecha_termino),
  }))
}

export async function seleccionarPeriodoUi(periodoId: number): Promise<void> {
  if (!Number.isInteger(periodoId) || periodoId <= 0) {
    throw new Error('El identificador del período seleccionado no es válido.')
  }
  await apiJson(`/periodos/${periodoId}/seleccionar`, { method: 'POST' })
}

export async function listarCalificadosUi(periodoId: number): Promise<CalificadoUi[]> {
  if (!Number.isInteger(periodoId) || periodoId <= 0) {
    throw new Error('El identificador del período no es válido.')
  }

  const filas = await apiJson<Array<{
    expediente_id: number
    hoja_vida_id: number | null
    persona_id: number
    grado: string | null
    nombres: string | null
    apellido_paterno: string | null
    apellido_materno: string | null
    run: string | null
    unidad_nombre: string | null
    expediente_estado: string | null
    persona_activa: number | null
  }>>(`/calificados?periodoId=${encodeURIComponent(periodoId)}`)

  return filas.map(fila => ({
    id: Number(fila.persona_id),
    personaId: Number(fila.persona_id),
    expedienteId: Number(fila.expediente_id),
    hojaVidaId: fila.hoja_vida_id == null ? null : Number(fila.hoja_vida_id),
    grado: fila.grado || 'Sin grado',
    nombre: [fila.nombres, fila.apellido_paterno, fila.apellido_materno].filter(Boolean).join(' ') || 'Persona sin nombre',
    run: fila.run || 'Sin RUN',
    unidad: fila.unidad_nombre || 'Sin unidad',
    estado: fila.persona_activa === 0 ? 'INACTIVO' : 'ACTIVO',
  }))
}
