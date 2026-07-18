import {
  obtenerEstadoConfiguracionInicial,
  guardarCalificadorDirecto,
} from './configuracionInicial'

import {
  obtenerBaseDatos,
} from './database'

import type {
  ConfiguracionBaseDatos,
  ConfiguracionCalificador,
  ConfiguracionNumeracion,
  ConfiguracionPeriodoActivo,
  ConfiguracionSistema,
} from '../types/configuracionSistema'

async function intentarSelect<T>(
  sql: string,
  parametros: unknown[] = [],
): Promise<T[]> {
  try {
    const db = await obtenerBaseDatos()

    return await db.select<T[]>(
      sql,
      parametros,
    )
  } catch (error) {
    console.warn(
      'Configuración: consulta omitida',
      {
        sql,
        error,
      },
    )

    return []
  }
}

function formatearBytes(
  bytes: number,
): string {
  if (!bytes || bytes < 0) {
    return 'No disponible'
  }

  const unidades = [
    'B',
    'KB',
    'MB',
    'GB',
  ]

  let valor = bytes
  let indice = 0

  while (
    valor >= 1024 &&
    indice < unidades.length - 1
  ) {
    valor = valor / 1024
    indice += 1
  }

  return `${valor.toFixed(indice === 0 ? 0 : 1)} ${unidades[indice]}`
}

function formatearNumeroResolucion(
  prefijo: string,
  correlativo: number,
): string {
  return `${prefijo}/${String(correlativo).padStart(3, '0')}`
}

export async function obtenerConfiguracionCalificador():
Promise<ConfiguracionCalificador> {
  const estado =
    await obtenerEstadoConfiguracionInicial()

  return {
    gradoId: estado.grado_id ?? null,
    run: estado.run ?? '',
    nombres: estado.nombres ?? '',
    apellidoPaterno:
      estado.apellido_paterno ?? '',
    apellidoMaterno:
      estado.apellido_materno ?? '',
    unidadNombre:
      estado.unidad_nombre ?? '',
    unidadSigla:
      estado.unidad_sigla ?? '',
    puesto:
      estado.puesto ?? '',
  }
}

export async function guardarConfiguracionCalificador(
  datos: ConfiguracionCalificador,
): Promise<void> {
  if (!datos.gradoId) {
    throw new Error(
      'Debe seleccionar el grado del calificador.',
    )
  }

  if (!datos.nombres.trim()) {
    throw new Error(
      'Debe ingresar los nombres del calificador.',
    )
  }

  if (!datos.apellidoPaterno.trim()) {
    throw new Error(
      'Debe ingresar el apellido paterno del calificador.',
    )
  }

  if (!datos.unidadNombre.trim()) {
    throw new Error(
      'Debe ingresar la unidad institucional.',
    )
  }

  if (!datos.unidadSigla.trim()) {
    throw new Error(
      'Debe ingresar la sigla de la unidad.',
    )
  }

  if (!datos.puesto.trim()) {
    throw new Error(
      'Debe ingresar el cargo o puesto del calificador.',
    )
  }

  await guardarCalificadorDirecto({
    gradoId: datos.gradoId,
    run: datos.run,
    nombres: datos.nombres,
    apellidoPaterno:
      datos.apellidoPaterno,
    apellidoMaterno:
      datos.apellidoMaterno,
    unidadNombre:
      datos.unidadNombre,
    unidadSigla:
      datos.unidadSigla,
    puesto: datos.puesto,
  })
}

export async function obtenerPeriodoActivo():
Promise<ConfiguracionPeriodoActivo> {
  const filas =
    await intentarSelect<{
      periodo_nombre: string | null
      periodo_anio: number | null
      fecha_inicio: string | null
      fecha_termino: string | null
      estado: string | null
      expedientes_asociados: number | null
    }>(
      `
        SELECT
          p.nombre AS periodo_nombre,
          p.anio AS periodo_anio,
          p.fecha_inicio,
          p.fecha_termino,
          COALESCE(p.estado, 'ACTIVO') AS estado,
          (
            SELECT COUNT(*)
            FROM expedientes_calificacion ex
            WHERE ex.periodo_id = p.id
          ) AS expedientes_asociados
        FROM configuracion c
        LEFT JOIN periodos p
          ON p.id = c.periodo_activo_id
        WHERE c.id = 1
        LIMIT 1
      `,
    )

  const fila = filas[0]

  return {
    nombre:
      fila?.periodo_nombre ??
      (
        fila?.periodo_anio
          ? `Período ${fila.periodo_anio}`
          : 'Sin período activo'
      ),
    anio:
      fila?.periodo_anio ?? null,
    fechaInicio:
      fila?.fecha_inicio ?? null,
    fechaTermino:
      fila?.fecha_termino ?? null,
    estado:
      fila?.estado ?? 'Sin estado',
    expedientesAsociados:
      fila?.expedientes_asociados ?? 0,
  }
}

export async function obtenerNumeracion():
Promise<ConfiguracionNumeracion> {
  const prefijo = '1530'

  const filas =
    await intentarSelect<{
      ultimo: number | null
    }>(
      `
        SELECT
          COALESCE(MAX(correlativo), 0) AS ultimo
        FROM resoluciones_documentales
        WHERE
          prefijo = $1
          AND estado = 'EMITIDA'
      `,
      [prefijo],
    )

  const ultimoCorrelativo =
    filas[0]?.ultimo ?? 0

  return {
    prefijoResolucion: prefijo,
    ultimoCorrelativo,
    proximoNumero:
      formatearNumeroResolucion(
        prefijo,
        ultimoCorrelativo + 1,
      ),
  }
}

export async function obtenerBaseDatosInfo():
Promise<ConfiguracionBaseDatos> {
  try {
    const db = await obtenerBaseDatos()

    const databaseList =
      await db.select<Array<{
        seq: number
        name: string
        file: string
      }>>(
        'PRAGMA database_list',
      )

    const archivo =
      databaseList.find(
        item => item.name === 'main',
      )?.file ?? 'No disponible'

    const pageCount =
      (
        await db.select<Array<{ page_count: number }>>(
          'PRAGMA page_count',
        )
      )[0]?.page_count ?? 0

    const pageSize =
      (
        await db.select<Array<{ page_size: number }>>(
          'PRAGMA page_size',
        )
      )[0]?.page_size ?? 0

    return {
      estado: 'conectada',
      ruta: archivo,
      tamanioAproximado:
        formatearBytes(
          pageCount * pageSize,
        ),
      ultimoRespaldo:
        'No registrado',
    }
  } catch {
    return {
      estado: 'desconectada',
      ruta: 'No disponible',
      tamanioAproximado: 'No disponible',
      ultimoRespaldo: 'No registrado',
    }
  }
}

export async function obtenerConfiguracionSistema():
Promise<ConfiguracionSistema> {
  const [
    calificador,
    periodo,
    numeracion,
    baseDatos,
  ] = await Promise.all([
    obtenerConfiguracionCalificador(),
    obtenerPeriodoActivo(),
    obtenerNumeracion(),
    obtenerBaseDatosInfo(),
  ])

  return {
    calificador,
    periodo,
    numeracion,
    baseDatos,
    acercaDe: {
      nombreAplicacion: 'HVDigital',
      version: '0.1.0',
      desarrollador: 'Marco Miranda',
      descripcion:
        'Sistema local de apoyo a Hojas de Vida y procesos de calificación.',
    },
  }
}
