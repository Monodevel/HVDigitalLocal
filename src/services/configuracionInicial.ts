import type {
  DatosCalificadorDirecto,
  EstadoConfiguracionInicialDto,
  ResultadoCreacionPeriodo,
  VigenciaPeriodo,
} from '../types/configuracionInicial'

import {
  obtenerBaseDatos,
} from './database'

function textoObligatorio(
  valor: string,
  etiqueta: string,
): string {
  const limpio = valor.trim()

  if (!limpio) {
    throw new Error(
      `Debe completar ${etiqueta}.`,
    )
  }

  return limpio
}

export async function obtenerEstadoConfiguracionInicial():
Promise<EstadoConfiguracionInicialDto> {
  const db = await obtenerBaseDatos()

  const filas =
    await db.select<EstadoConfiguracionInicialDto[]>(
      `
        SELECT *
        FROM vw_estado_configuracion_inicial
        WHERE id = 1
        LIMIT 1
      `,
    )

  const estado = filas[0]

  if (!estado) {
    throw new Error(
      'No fue posible obtener el estado de la configuración inicial.',
    )
  }

  return estado
}

export async function guardarCalificadorDirecto(
  datos: DatosCalificadorDirecto,
): Promise<number> {
  if (
    !Number.isInteger(datos.gradoId) ||
    datos.gradoId <= 0
  ) {
    throw new Error(
      'Debe seleccionar el grado del calificador.',
    )
  }

  const nombres = textoObligatorio(
    datos.nombres,
    'los nombres',
  )

  const apellidoPaterno =
    textoObligatorio(
      datos.apellidoPaterno,
      'el apellido paterno',
    )

  const unidadNombre =
    textoObligatorio(
      datos.unidadNombre,
      'la unidad o repartición',
    )

  const unidadSigla =
    textoObligatorio(
      datos.unidadSigla,
      'la sigla de la unidad',
    )

  const puesto =
    textoObligatorio(
      datos.puesto,
      'el puesto',
    )

  const db = await obtenerBaseDatos()

  const configuracion =
    await obtenerEstadoConfiguracionInicial()

  let calificadorId =
    configuracion.calificador_directo_id

  if (calificadorId) {
    await db.execute(
      `
        UPDATE calificadores_directos
        SET
          grado_id = $1,
          run = $2,
          nombres = $3,
          apellido_paterno = $4,
          apellido_materno = $5,
          unidad_nombre = $6,
          unidad_sigla = $7,
          puesto = $8,
          actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $9
      `,
      [
        datos.gradoId,
        datos.run?.trim() || null,
        nombres,
        apellidoPaterno,
        datos.apellidoMaterno?.trim() || null,
        unidadNombre,
        unidadSigla.toUpperCase(),
        puesto,
        calificadorId,
      ],
    )
  } else {
    const resultado = await db.execute(
      `
        INSERT INTO calificadores_directos (
          grado_id,
          run,
          nombres,
          apellido_paterno,
          apellido_materno,
          unidad_nombre,
          unidad_sigla,
          puesto
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        )
      `,
      [
        datos.gradoId,
        datos.run?.trim() || null,
        nombres,
        apellidoPaterno,
        datos.apellidoMaterno?.trim() || null,
        unidadNombre,
        unidadSigla.toUpperCase(),
        puesto,
      ],
    )

    if (
      resultado.lastInsertId === undefined
    ) {
      throw new Error(
        'No fue posible obtener el calificador creado.',
      )
    }

    calificadorId =
      Number(resultado.lastInsertId)
  }

  await db.execute(
    `
      UPDATE configuracion_inicial
      SET
        calificador_directo_id = $1,
        estado = 'EN_PROGRESO',
        paso_actual = CASE
          WHEN paso_actual < 2
            THEN 2
          ELSE paso_actual
        END,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id = 1
    `,
    [calificadorId],
  )

  return calificadorId
}

function fecha(
  anio: number,
  mesDia: string,
): string {
  return `${anio}-${mesDia}`
}

export async function crearPeriodoInicial(
  anioInicio: number,
): Promise<ResultadoCreacionPeriodo> {
  const anioActual =
    new Date().getFullYear()

  if (
    !Number.isInteger(anioInicio) ||
    anioInicio < anioActual - 10 ||
    anioInicio > anioActual + 5
  ) {
    throw new Error(
      'El año seleccionado no es válido.',
    )
  }

  const estado =
    await obtenerEstadoConfiguracionInicial()

  if (!estado.calificador_directo_id) {
    throw new Error(
      'Primero debe registrar al calificador directo.',
    )
  }

  const db = await obtenerBaseDatos()

  const anioTermino =
    anioInicio + 1

  const nombre =
    `${anioInicio}-${anioTermino}`

  const fechaInicioGeneral =
    fecha(anioInicio, '06-01')

  const fechaTerminoGeneral =
    fecha(anioTermino, '07-31')

  const vigencias = [
    {
      codigo: 'OFICIALES',
      nombre: 'Oficiales',
      inicio:
        fecha(anioInicio, '07-01'),
      termino:
        fecha(anioTermino, '06-30'),
      orden: 1,
    },
    {
      codigo: 'CP_TROPA_JORNAL',
      nombre:
        'Cuadro Permanente, Tropa Profesional y Personal a Jornal',
      inicio:
        fecha(anioInicio, '06-01'),
      termino:
        fecha(anioTermino, '05-31'),
      orden: 2,
    },
    {
      codigo: 'PERSONAL_CIVIL',
      nombre:
        'Personal civil',
      inicio:
        fecha(anioInicio, '08-01'),
      termino:
        fecha(anioTermino, '07-31'),
      orden: 3,
    },
  ]

  const periodosExistentes =
    await db.select<
      Array<{ id: number }>
    >(
      `
        SELECT id
        FROM periodos
        WHERE anio = $1
        LIMIT 1
      `,
      [anioInicio],
    )

  let periodoId =
    periodosExistentes[0]?.id

  if (periodoId) {
    await db.execute(
      `
        UPDATE periodos
        SET
          nombre = $1,
          fecha_inicio = $2,
          fecha_termino = $3,
          estado = 'abierto'
        WHERE id = $4
      `,
      [
        nombre,
        fechaInicioGeneral,
        fechaTerminoGeneral,
        periodoId,
      ],
    )
  } else {
    const resultado =
      await db.execute(
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
          anioInicio,
          fechaInicioGeneral,
          fechaTerminoGeneral,
        ],
      )

    if (
      resultado.lastInsertId === undefined
    ) {
      throw new Error(
        'No fue posible obtener el período creado.',
      )
    }

    periodoId =
      Number(resultado.lastInsertId)
  }

  for (const vigencia of vigencias) {
    await db.execute(
      `
        INSERT INTO vigencias_periodo (
          periodo_id,
          codigo_regimen,
          nombre_regimen,
          fecha_inicio,
          fecha_termino,
          orden
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )
        ON CONFLICT(
          periodo_id,
          codigo_regimen
        )
        DO UPDATE SET
          nombre_regimen =
            excluded.nombre_regimen,
          fecha_inicio =
            excluded.fecha_inicio,
          fecha_termino =
            excluded.fecha_termino,
          orden =
            excluded.orden,
          activo = 1
      `,
      [
        periodoId,
        vigencia.codigo,
        vigencia.nombre,
        vigencia.inicio,
        vigencia.termino,
        vigencia.orden,
      ],
    )
  }

  await db.execute(
    `
      UPDATE configuracion_inicial
      SET
        periodo_activo_id = $1,
        estado = 'CONFIGURADA_SIN_PERSONAL',
        paso_actual = 3,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id = 1
    `,
    [periodoId],
  )

  const vigenciasGuardadas =
    await db.select<VigenciaPeriodo[]>(
      `
        SELECT
          id,
          periodo_id,
          codigo_regimen,
          nombre_regimen,
          fecha_inicio,
          fecha_termino,
          orden
        FROM vigencias_periodo
        WHERE
          periodo_id = $1
          AND activo = 1
        ORDER BY orden
      `,
      [periodoId],
    )

  return {
    periodoId,
    nombre,
    anioInicio,
    anioTermino,
    vigencias:
      vigenciasGuardadas,
  }
}