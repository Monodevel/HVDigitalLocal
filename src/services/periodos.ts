import {
  obtenerBaseDatos,
} from './database'

import type {
  CerrarPeriodoInput,
  ContextoPeriodo,
  CrearPeriodoInput,
  EstadoPeriodo,
  PeriodoCalificacion,
  SeleccionarPeriodoInput,
} from '../types/periodos'

interface PeriodoFila {
  id: number
  nombre: string | null
  anio: number | null
  fecha_inicio: string | null
  fecha_termino: string | null
  estado: EstadoPeriodo | null
  cerrado_en: string | null
  observacion_cierre: string | null
  modo_lectura: number | null
}

interface ConfiguracionFila {
  periodo_activo_id: number | null
  periodo_visualizacion_id: number | null
  modo_lectura_periodo_visualizacion: number | null
}

async function ejecutarSeguro(
  sql: string,
): Promise<void> {
  try {
    const db = await obtenerBaseDatos()
    await db.execute(sql)
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : String(error)

    if (
      mensaje.includes('duplicate column') ||
      mensaje.includes('no such table')
    ) {
      return
    }

    throw error
  }
}

export async function asegurarSoportePeriodos():
Promise<void> {
  await ejecutarSeguro(`
    ALTER TABLE periodos
      ADD COLUMN estado TEXT NOT NULL DEFAULT 'ABIERTO'
  `)

  await ejecutarSeguro(`
    ALTER TABLE periodos
      ADD COLUMN cerrado_en TEXT NULL
  `)

  await ejecutarSeguro(`
    ALTER TABLE periodos
      ADD COLUMN observacion_cierre TEXT NULL
  `)

  await ejecutarSeguro(`
    ALTER TABLE periodos
      ADD COLUMN modo_lectura INTEGER NOT NULL DEFAULT 0
  `)

  await ejecutarSeguro(`
    ALTER TABLE configuracion
      ADD COLUMN periodo_visualizacion_id INTEGER NULL
  `)

  await ejecutarSeguro(`
    ALTER TABLE configuracion
      ADD COLUMN modo_lectura_periodo_visualizacion INTEGER NOT NULL DEFAULT 0
  `)

  const db = await obtenerBaseDatos()

  await db.execute(`
    UPDATE periodos
    SET estado = 'ABIERTO'
    WHERE estado IS NULL
       OR TRIM(estado) = ''
  `)

  await db.execute(`
    UPDATE configuracion
    SET periodo_visualizacion_id = periodo_activo_id
    WHERE periodo_visualizacion_id IS NULL
  `)

  await db.execute(`
    UPDATE configuracion
    SET modo_lectura_periodo_visualizacion = 0
    WHERE modo_lectura_periodo_visualizacion IS NULL
  `)
}

function mapearPeriodo(
  fila: PeriodoFila,
  configuracion?: ConfiguracionFila,
): PeriodoCalificacion {
  const estado =
    fila.estado === 'CERRADO'
      ? 'CERRADO'
      : 'ABIERTO'

  return {
    id: fila.id,
    nombre:
      fila.nombre ??
      `Período ${fila.anio ?? fila.id}`,
    anio: fila.anio,
    fechaInicio: fila.fecha_inicio,
    fechaTermino: fila.fecha_termino,
    estado,
    cerradoEn: fila.cerrado_en,
    observacionCierre: fila.observacion_cierre,
    modoLectura:
      estado === 'CERRADO' ||
      fila.modo_lectura === 1,
    esPeriodoActivo:
      configuracion?.periodo_activo_id === fila.id,
    esPeriodoVisualizado:
      configuracion?.periodo_visualizacion_id === fila.id,
  }
}

async function obtenerConfiguracion():
Promise<ConfiguracionFila> {
  await asegurarSoportePeriodos()

  const db = await obtenerBaseDatos()

  const filas =
    await db.select<ConfiguracionFila[]>(`
      SELECT
        periodo_activo_id,
        periodo_visualizacion_id,
        modo_lectura_periodo_visualizacion
      FROM configuracion
      WHERE id = 1
      LIMIT 1
    `)

  return filas[0] ?? {
    periodo_activo_id: null,
    periodo_visualizacion_id: null,
    modo_lectura_periodo_visualizacion: 0,
  }
}

export async function listarPeriodosCalificacion():
Promise<PeriodoCalificacion[]> {
  await asegurarSoportePeriodos()

  const db = await obtenerBaseDatos()
  const configuracion =
    await obtenerConfiguracion()

  const filas =
    await db.select<PeriodoFila[]>(`
      SELECT
        id,
        nombre,
        anio,
        fecha_inicio,
        fecha_termino,
        estado,
        cerrado_en,
        observacion_cierre,
        modo_lectura
      FROM periodos
      ORDER BY
        COALESCE(anio, 0) DESC,
        id DESC
    `)

  return filas.map(fila =>
    mapearPeriodo(
      fila,
      configuracion,
    ),
  )
}

export async function obtenerContextoPeriodo():
Promise<ContextoPeriodo> {
  await asegurarSoportePeriodos()

  const configuracion =
    await obtenerConfiguracion()

  const periodos =
    await listarPeriodosCalificacion()

  const periodoActivo =
    periodos.find(
      periodo =>
        periodo.id ===
        configuracion.periodo_activo_id,
    ) ?? null

  const periodoVisualizado =
    periodos.find(
      periodo =>
        periodo.id ===
        configuracion.periodo_visualizacion_id,
    ) ??
    periodoActivo ??
    null

  const modoLectura =
    Boolean(
      configuracion.modo_lectura_periodo_visualizacion,
    ) ||
    periodoVisualizado?.estado === 'CERRADO'

  return {
    periodoActivoId:
      configuracion.periodo_activo_id,
    periodoVisualizacionId:
      configuracion.periodo_visualizacion_id,
    modoLectura,
    periodoActivo,
    periodoVisualizado,
  }
}

export async function crearPeriodoCalificacion(
  input: CrearPeriodoInput,
): Promise<number> {
  await asegurarSoportePeriodos()

  const nombre =
    input.nombre.trim()

  if (!nombre) {
    throw new Error(
      'Debe indicar el nombre del período.',
    )
  }

  const db = await obtenerBaseDatos()

  const resultado =
    await db.execute(
      `
        INSERT INTO periodos (
          nombre,
          anio,
          fecha_inicio,
          fecha_termino,
          estado,
          modo_lectura
        )
        VALUES (?, ?, ?, ?, 'ABIERTO', 0)
      `,
      [
        nombre,
        input.anio ?? null,
        input.fechaInicio ?? null,
        input.fechaTermino ?? null,
      ],
    )

  const periodoId =
    Number(resultado.lastInsertId)

  if (input.activar !== false) {
    await db.execute(
      `
        UPDATE configuracion
        SET
          periodo_activo_id = ?,
          periodo_visualizacion_id = ?,
          modo_lectura_periodo_visualizacion = 0
        WHERE id = 1
      `,
      [
        periodoId,
        periodoId,
      ],
    )
  }

  return periodoId
}

export async function cerrarPeriodoCalificacion(
  input: CerrarPeriodoInput,
): Promise<void> {
  await asegurarSoportePeriodos()

  const db = await obtenerBaseDatos()

  const configuracion =
    await obtenerConfiguracion()

  if (
    configuracion.periodo_activo_id !==
    input.periodoId
  ) {
    throw new Error(
      'Solo se puede cerrar el período activo de trabajo.',
    )
  }

  const pendientes =
    await contarPendientesPeriodo(input.periodoId)

  if (pendientes > 0) {
    throw new Error(
      `No se puede cerrar el período porque existen ${pendientes} elemento(s) pendiente(s).`,
    )
  }

  await db.execute(
    `
      UPDATE periodos
      SET
        estado = 'CERRADO',
        cerrado_en = datetime('now'),
        observacion_cierre = ?,
        modo_lectura = 1
      WHERE id = ?
    `,
    [
      input.observacion ?? null,
      input.periodoId,
    ],
  )

  await db.execute(
    `
      UPDATE configuracion
      SET
        periodo_visualizacion_id = ?,
        modo_lectura_periodo_visualizacion = 1
      WHERE id = 1
    `,
    [
      input.periodoId,
    ],
  )
}

export async function seleccionarPeriodoCerradoLectura(
  input: SeleccionarPeriodoInput,
): Promise<void> {
  await asegurarSoportePeriodos()

  const db = await obtenerBaseDatos()

  const filas =
    await db.select<PeriodoFila[]>(
      `
        SELECT
          id,
          nombre,
          anio,
          fecha_inicio,
          fecha_termino,
          estado,
          cerrado_en,
          observacion_cierre,
          modo_lectura
        FROM periodos
        WHERE id = ?
        LIMIT 1
      `,
      [
        input.periodoId,
      ],
    )

  const periodo =
    filas[0]

  if (!periodo) {
    throw new Error(
      'No se encontró el período seleccionado.',
    )
  }

  if (periodo.estado !== 'CERRADO') {
    throw new Error(
      'Esta acción es solo para períodos cerrados.',
    )
  }

  await db.execute(
    `
      UPDATE configuracion
      SET
        periodo_visualizacion_id = ?,
        modo_lectura_periodo_visualizacion = 1
      WHERE id = 1
    `,
    [
      input.periodoId,
    ],
  )
}

export async function volverAlPeriodoActivo():
Promise<void> {
  await asegurarSoportePeriodos()

  const db = await obtenerBaseDatos()

  const configuracion =
    await obtenerConfiguracion()

  if (!configuracion.periodo_activo_id) {
    throw new Error(
      'No existe un período activo de trabajo.',
    )
  }

  await db.execute(
    `
      UPDATE configuracion
      SET
        periodo_visualizacion_id = periodo_activo_id,
        modo_lectura_periodo_visualizacion = 0
      WHERE id = 1
    `,
  )
}

export async function activarPeriodoAbierto(
  input: SeleccionarPeriodoInput,
): Promise<void> {
  await asegurarSoportePeriodos()

  const db = await obtenerBaseDatos()

  const filas =
    await db.select<PeriodoFila[]>(
      `
        SELECT
          id,
          nombre,
          anio,
          fecha_inicio,
          fecha_termino,
          estado,
          cerrado_en,
          observacion_cierre,
          modo_lectura
        FROM periodos
        WHERE id = ?
        LIMIT 1
      `,
      [
        input.periodoId,
      ],
    )

  const periodo =
    filas[0]

  if (!periodo) {
    throw new Error(
      'No se encontró el período seleccionado.',
    )
  }

  if (periodo.estado === 'CERRADO') {
    throw new Error(
      'Un período cerrado no puede volver a activarse.',
    )
  }

  await db.execute(
    `
      UPDATE configuracion
      SET
        periodo_activo_id = ?,
        periodo_visualizacion_id = ?,
        modo_lectura_periodo_visualizacion = 0
      WHERE id = 1
    `,
    [
      input.periodoId,
      input.periodoId,
    ],
  )
}

export async function validarOperacionEditable():
Promise<void> {
  const contexto =
    await obtenerContextoPeriodo()

  if (contexto.modoLectura) {
    throw new Error(
      'El período visualizado está cerrado y solo permite consulta. No se pueden crear, editar, estampar ni eliminar registros.',
    )
  }
}

export async function contarPendientesPeriodo(
  periodoId: number,
): Promise<number> {
  await asegurarSoportePeriodos()

  const db = await obtenerBaseDatos()

  let total = 0

  try {
    const filas =
      await db.select<Array<{ total: number }>>(
        `
          SELECT COUNT(*) AS total
          FROM borradores_anotacion b
          INNER JOIN hojas_vida hv
            ON hv.id = b.hoja_vida_id
          WHERE hv.periodo_id = ?
            AND b.estado NOT IN ('anulado', 'ANULADO')
        `,
        [
          periodoId,
        ],
      )

    total += Number(filas[0]?.total ?? 0)
  } catch {
    // Tabla no disponible todavía.
  }

  try {
    const filas =
      await db.select<Array<{ total: number }>>(
        `
          SELECT COUNT(*) AS total
          FROM instrumentos_expediente ie
          INNER JOIN expedientes_calificacion ex
            ON ex.id = ie.expediente_id
          WHERE ex.periodo_id = ?
            AND (
              ie.estado IS NULL
              OR ie.estado NOT IN (
                'completado',
                'COMPLETADO',
                'cerrado',
                'CERRADO',
                'NO_APLICA'
              )
            )
        `,
        [
          periodoId,
        ],
      )

    total += Number(filas[0]?.total ?? 0)
  } catch {
    // Tabla no disponible todavía.
  }

  return total
}
