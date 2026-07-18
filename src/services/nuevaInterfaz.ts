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
    SELECT
      id,
      nombre,
      anio,
      fecha_inicio,
      fecha_termino,
      estado
    FROM periodos
    ORDER BY fecha_inicio DESC, id DESC
  `)

  return filas.map(fila => ({
    id: Number(fila.id),
    nombre:
      fila.nombre ||
      (fila.anio
        ? `Período de Calificaciones ${fila.anio}–${fila.anio + 1}`
        : `Período ${fila.id}`),
    estado:
      String(fila.estado ?? 'abierto').toUpperCase() === 'CERRADO'
        ? 'CERRADO'
        : 'ABIERTO',
    fechaInicio: fechaVisual(fila.fecha_inicio),
    fechaTermino: fechaVisual(fila.fecha_termino),
  }))
}

export async function seleccionarPeriodoUi(periodoId: number): Promise<void> {
  if (!Number.isInteger(periodoId) || periodoId <= 0) {
    throw new Error('El identificador del período seleccionado no es válido.')
  }

  const db = await obtenerBaseDatos()

  const periodos = await db.select<Array<{ id: number }>>(
    `
      SELECT id
      FROM periodos
      WHERE id = $1
      LIMIT 1
    `,
    [periodoId],
  )

  if (!periodos[0]) {
    throw new Error('El período seleccionado ya no existe en la base de datos.')
  }

  const resultado = await db.execute(
    `
      UPDATE configuracion_inicial
      SET
        periodo_activo_id = $1,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id = 1
    `,
    [periodoId],
  )

  if (resultado.rowsAffected === 0) {
    throw new Error('No existe la configuración inicial de HVDigital.')
  }
}

export async function listarCalificadosUi(
  periodoId: number,
): Promise<CalificadoUi[]> {
  if (!Number.isInteger(periodoId) || periodoId <= 0) {
    throw new Error('El identificador del período no es válido.')
  }

  const db = await obtenerBaseDatos()

  const filas = await db.select<Array<{
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
  }>>(
    `
      SELECT
        ex.id AS expediente_id,
        ehv.hoja_vida_id,
        p.id AS persona_id,
        COALESCE(
          g.abreviatura,
          cp.abreviatura,
          g.nombre,
          cp.nombre,
          ''
        ) AS grado,
        p.nombres,
        p.apellido_paterno,
        p.apellido_materno,
        p.run,
        d.unidad_nombre,
        ex.estado AS expediente_estado,
        p.activo AS persona_activa
      FROM expedientes_calificacion ex
      INNER JOIN designaciones_calificacion d
        ON d.id = ex.designacion_id
      INNER JOIN personas p
        ON p.id = ex.persona_id
      LEFT JOIN grados g
        ON g.id = d.grado_id_inicio
      LEFT JOIN calidades_personal cp
        ON cp.id = d.calidad_personal_id_inicio
      LEFT JOIN expediente_hojas_vida ehv
        ON ehv.expediente_id = ex.id
      WHERE ex.periodo_id = $1
        AND UPPER(COALESCE(ex.estado, 'ABIERTO')) <> 'ANULADO'
        AND UPPER(COALESCE(d.estado, 'ACTIVA')) <> 'ANULADA'
      ORDER BY
        COALESCE(g.abreviatura, cp.abreviatura, ''),
        p.apellido_paterno,
        p.apellido_materno,
        p.nombres
    `,
    [periodoId],
  )

  return filas.map(fila => ({
    id: Number(fila.persona_id),
    expedienteId: Number(fila.expediente_id),
    hojaVidaId:
      fila.hoja_vida_id == null
        ? null
        : Number(fila.hoja_vida_id),
    grado: fila.grado || 'Sin grado',
    nombre:
      [
        fila.nombres,
        fila.apellido_paterno,
        fila.apellido_materno,
      ]
        .filter(Boolean)
        .join(' ') || 'Calificado sin nombre',
    run: fila.run || 'Sin RUN',
    unidad: fila.unidad_nombre || 'Sin unidad',
    estado: fila.persona_activa === 0 ? 'INACTIVO' : 'ACTIVO',
  }))
}
