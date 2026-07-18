import { obtenerBaseDatos } from './database'

export type PeriodoUi = {
  id: number
  nombre: string
  estado: 'ABIERTO' | 'CERRADO'
  fechaInicio: string
  fechaTermino: string
}

export type CalificadoUi = {
  id: number
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
  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : fecha
}

export async function listarPeriodosUi(): Promise<PeriodoUi[]> {
  const db = await obtenerBaseDatos()
  const filas = await db.select<Array<{
    id: number
    nombre: string | null
    anio: number | null
    fecha_inicio: string | null
    fecha_termino: string | null
    estado: string | null
  }>>(`
    SELECT id, nombre, anio, fecha_inicio, fecha_termino, estado
    FROM periodos
    ORDER BY fecha_inicio DESC, id DESC
  `)

  return filas.map(fila => ({
    id: Number(fila.id),
    nombre: fila.nombre || (fila.anio ? `Período de Calificaciones ${fila.anio}–${fila.anio + 1}` : `Período ${fila.id}`),
    estado: String(fila.estado ?? 'abierto').toUpperCase() === 'CERRADO' ? 'CERRADO' : 'ABIERTO',
    fechaInicio: fechaVisual(fila.fecha_inicio),
    fechaTermino: fechaVisual(fila.fecha_termino),
  }))
}

export async function seleccionarPeriodoUi(periodoId: number): Promise<void> {
  const db = await obtenerBaseDatos()
  await db.execute(
    'UPDATE configuracion SET periodo_activo_id = ? WHERE id = 1',
    [periodoId],
  )
}

export async function listarCalificadosUi(periodoId: number): Promise<CalificadoUi[]> {
  const db = await obtenerBaseDatos()

  const filas = await db.select<Array<{
    expediente_id: number
    hoja_vida_id: number | null
    persona_id: number
    grado: string | null
    nombres: string | null
    apellido_paterno: string | null
    apellido_materno: string | null
    nombre_completo: string | null
    run: string | null
    unidad: string | null
    estado: string | null
  }>>(`
    SELECT
      ex.id AS expediente_id,
      hv.id AS hoja_vida_id,
      ex.persona_id,
      COALESCE(r.grado_calidad_abreviatura, r.grado, '') AS grado,
      r.nombres,
      r.apellido_paterno,
      r.apellido_materno,
      r.nombre_completo,
      COALESCE(r.run, r.rut, '') AS run,
      COALESCE(r.unidad, r.unidad_nombre, '') AS unidad,
      ex.estado
    FROM expedientes_calificacion ex
    LEFT JOIN hojas_vida hv
      ON hv.persona_id = ex.persona_id
      AND hv.periodo_id = ex.periodo_id
      AND hv.categoria_id = ex.categoria_id
    LEFT JOIN vw_hoja_vida_resumen r
      ON r.hoja_vida_id = hv.id
    WHERE ex.periodo_id = ?
      AND (ex.estado IS NULL OR UPPER(ex.estado) <> 'ANULADO')
    ORDER BY
      COALESCE(r.grado_calidad_abreviatura, r.grado, ''),
      COALESCE(r.apellido_paterno, ''),
      COALESCE(r.apellido_materno, ''),
      COALESCE(r.nombres, '')
  `, [periodoId])

  return filas.map(fila => {
    const nombre = fila.nombre_completo || [
      fila.nombres,
      fila.apellido_paterno,
      fila.apellido_materno,
    ].filter(Boolean).join(' ')

    return {
      id: Number(fila.persona_id),
      expedienteId: Number(fila.expediente_id),
      hojaVidaId: fila.hoja_vida_id == null ? null : Number(fila.hoja_vida_id),
      grado: fila.grado || 'Sin grado',
      nombre: nombre || 'Calificado sin nombre',
      run: fila.run || 'Sin RUN',
      unidad: fila.unidad || 'Sin unidad',
      estado: String(fila.estado ?? 'ACTIVO').toUpperCase() === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO',
    }
  })
}
