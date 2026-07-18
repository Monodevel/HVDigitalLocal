import Database from '@tauri-apps/plugin-sql'

import type {
  Configuracion,
  ConfiguracionInicialRequest,
  CrearPeriodoRequest,
  Periodo,
} from '../types/hvdigital'

const DATABASE_URL = 'sqlite:hvdigital.db'

let databasePromise: Promise<Database> | null = null

async function inicializarBaseDatos(): Promise<Database> {
  const db = await Database.load(DATABASE_URL)

  await db.execute('PRAGMA foreign_keys = ON')
  await db.execute('PRAGMA busy_timeout = 10000')
  await db.execute('PRAGMA journal_mode = WAL')
  await db.execute('PRAGMA synchronous = NORMAL')

  return db
}

/**
 * Punto único de acceso a SQLite.
 *
 * Todos los servicios deben importar esta función en lugar de
 * ejecutar Database.load() por separado.
 */
export function obtenerBaseDatos(): Promise<Database> {
  if (databasePromise === null) {
    databasePromise = inicializarBaseDatos()
  }

  return databasePromise
}

export async function obtenerConfiguracion():
Promise<Configuracion | null> {
  const db = await obtenerBaseDatos()

  const resultados = await db.select<Configuracion[]>(
    `
      SELECT
        id,
        unidad_nombre,
        unidad_sigla,
        responsable,
        periodo_activo_id,
        configurado_en
      FROM configuracion
      WHERE id = 1
      LIMIT 1
    `,
  )

  return resultados[0] ?? null
}

export async function guardarConfiguracionInicial(
  solicitud: ConfiguracionInicialRequest,
): Promise<Configuracion> {
  const unidadNombre =
    solicitud.unidadNombre.trim()

  const unidadSigla =
    solicitud.unidadSigla
      .trim()
      .toUpperCase()

  const responsable =
    solicitud.responsable.trim()

  if (unidadNombre.length < 3) {
    throw new Error(
      'El nombre de la unidad debe tener al menos 3 caracteres.',
    )
  }

  if (unidadSigla.length < 2) {
    throw new Error(
      'La sigla debe tener al menos 2 caracteres.',
    )
  }

  if (responsable.length < 3) {
    throw new Error(
      'Debe indicar el responsable de la aplicación.',
    )
  }

  const db = await obtenerBaseDatos()

  await db.execute(
    `
      INSERT INTO configuracion (
        id,
        unidad_nombre,
        unidad_sigla,
        responsable,
        periodo_activo_id
      )
      VALUES (
        1,
        $1,
        $2,
        $3,
        NULL
      )
      ON CONFLICT(id) DO UPDATE SET
        unidad_nombre =
          excluded.unidad_nombre,
        unidad_sigla =
          excluded.unidad_sigla,
        responsable =
          excluded.responsable
    `,
    [
      unidadNombre,
      unidadSigla,
      responsable,
    ],
  )

  const configuracion =
    await obtenerConfiguracion()

  if (configuracion === null) {
    throw new Error(
      'No fue posible recuperar la configuración guardada.',
    )
  }

  return configuracion
}

export async function listarPeriodos():
Promise<Periodo[]> {
  const db = await obtenerBaseDatos()

  return db.select<Periodo[]>(
    `
      SELECT
        id,
        nombre,
        anio,
        fecha_inicio,
        fecha_termino,
        estado,
        creado_en
      FROM periodos
      ORDER BY
        anio DESC,
        id DESC
    `,
  )
}

export async function crearPeriodo(
  solicitud: CrearPeriodoRequest,
): Promise<Periodo> {
  const nombre =
    solicitud.nombre.trim()

  const anio =
    Number(solicitud.anio)

  if (nombre.length < 3) {
    throw new Error(
      'El nombre del período debe tener al menos 3 caracteres.',
    )
  }

  if (
    !Number.isInteger(anio) ||
    anio < 2000 ||
    anio > 2100
  ) {
    throw new Error(
      'El año del período no es válido.',
    )
  }

  if (
    !solicitud.fechaInicio ||
    !solicitud.fechaTermino
  ) {
    throw new Error(
      'Debe indicar las fechas de inicio y término.',
    )
  }

  if (
    solicitud.fechaTermino <
    solicitud.fechaInicio
  ) {
    throw new Error(
      'La fecha de término no puede ser anterior a la fecha de inicio.',
    )
  }

  const db = await obtenerBaseDatos()

  const existente =
    await db.select<Array<{ id: number }>>(
      `
        SELECT id
        FROM periodos
        WHERE anio = $1
        LIMIT 1
      `,
      [anio],
    )

  if (existente.length > 0) {
    throw new Error(
      `Ya existe un período para el año ${anio}.`,
    )
  }

  const resultado = await db.execute(
    `
      INSERT INTO periodos (
        nombre,
        anio,
        fecha_inicio,
        fecha_termino,
        estado
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'abierto'
      )
    `,
    [
      nombre,
      anio,
      solicitud.fechaInicio,
      solicitud.fechaTermino,
    ],
  )

  if (
    resultado.lastInsertId === undefined
  ) {
    throw new Error(
      'No fue posible obtener el período creado.',
    )
  }

  const periodos =
    await db.select<Periodo[]>(
      `
        SELECT
          id,
          nombre,
          anio,
          fecha_inicio,
          fecha_termino,
          estado,
          creado_en
        FROM periodos
        WHERE id = $1
        LIMIT 1
      `,
      [resultado.lastInsertId],
    )

  const periodo = periodos[0]

  if (!periodo) {
    throw new Error(
      'El período fue creado, pero no pudo recuperarse.',
    )
  }

  return periodo
}

export async function abrirPeriodo(
  periodoId: number,
): Promise<Periodo> {
  if (
    !Number.isInteger(periodoId) ||
    periodoId <= 0
  ) {
    throw new Error(
      'El identificador del período no es válido.',
    )
  }

  const db = await obtenerBaseDatos()

  const periodos =
    await db.select<Periodo[]>(
      `
        SELECT
          id,
          nombre,
          anio,
          fecha_inicio,
          fecha_termino,
          estado,
          creado_en
        FROM periodos
        WHERE id = $1
        LIMIT 1
      `,
      [periodoId],
    )

  const periodo = periodos[0]

  if (!periodo) {
    throw new Error(
      'El período seleccionado no existe.',
    )
  }

  if (periodo.estado !== 'abierto') {
    throw new Error(
      'No se puede abrir un período cerrado.',
    )
  }

  await db.execute(
    `
      UPDATE configuracion
      SET periodo_activo_id = $1
      WHERE id = 1
    `,
    [periodoId],
  )

  return periodo
}

export async function obtenerPeriodoActivo():
Promise<Periodo | null> {
  const db = await obtenerBaseDatos()

  const periodos =
    await db.select<Periodo[]>(
      `
        SELECT
          p.id,
          p.nombre,
          p.anio,
          p.fecha_inicio,
          p.fecha_termino,
          p.estado,
          p.creado_en
        FROM periodos p
        INNER JOIN configuracion c
          ON c.periodo_activo_id = p.id
        WHERE c.id = 1
        LIMIT 1
      `,
    )

  return periodos[0] ?? null
}