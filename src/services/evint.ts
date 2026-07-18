import type {
  ConceptoEvint,
  EscalaEvint,
  EvintEncabezado,
  GuardarEvintRequest,
  GuardarRespuestaEvintRequest,
  RespuestaEvint,
  ResultadoCalculoEvint,
  ResultadoConceptoEvint,
} from '../types/evint'

import {
  obtenerBaseDatos,
} from './database'

function nombreCompleto(
  nombres: string,
  apellidoPaterno: string,
  apellidoMaterno: string | null,
): string {
  return [
    apellidoPaterno,
    apellidoMaterno,
    nombres,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

export async function listarEscalasEvint():
Promise<EscalaEvint[]> {
  const db = await obtenerBaseDatos()

  return db.select<EscalaEvint[]>(
    `
      SELECT
        id,
        codigo,
        nombre,
        valor,
        orden
      FROM escalas_evint
      WHERE activo = 1
      ORDER BY orden
    `,
  )
}

export async function obtenerOCrearEvint(
  instrumentoId: number,
): Promise<EvintEncabezado> {
  const db = await obtenerBaseDatos()

  const instrumentos = await db.select<Array<{
    instrumento_id: number
    expediente_id: number
    numero: number
    tipo_instrumento: string
  }>>(
    `
      SELECT
        id AS instrumento_id,
        expediente_id,
        numero,
        tipo_instrumento
      FROM instrumentos_expediente
      WHERE id = $1
      LIMIT 1
    `,
    [instrumentoId],
  )

  const instrumento = instrumentos[0]

  if (!instrumento) {
    throw new Error('El instrumento seleccionado no existe.')
  }

  if (instrumento.tipo_instrumento !== 'EVINT') {
    throw new Error('El instrumento seleccionado no corresponde a una EVINT.')
  }

  await db.execute(
    `
      INSERT INTO evaluaciones_evint (
        instrumento_id,
        expediente_id,
        numero,
        estado
      )
      VALUES ($1, $2, $3, 'BORRADOR')
      ON CONFLICT(instrumento_id)
      DO NOTHING
    `,
    [
      instrumento.instrumento_id,
      instrumento.expediente_id,
      instrumento.numero,
    ],
  )

  const evaluaciones = await db.select<Array<{ id: number }>>(
    `
      SELECT id
      FROM evaluaciones_evint
      WHERE instrumento_id = $1
      LIMIT 1
    `,
    [instrumentoId],
  )

  const evaluacionId = evaluaciones[0]?.id

  if (!evaluacionId) {
    throw new Error('No fue posible crear o recuperar la EVINT.')
  }

  await db.execute(
    `
      INSERT OR IGNORE INTO respuestas_evint (
        evaluacion_evint_id,
        factor_id
      )
      SELECT
        $1,
        factor_id
      FROM vw_evint_factores
    `,
    [evaluacionId],
  )

  const encabezado = await obtenerEvint(evaluacionId)

  if (!encabezado) {
    throw new Error('No fue posible recuperar la EVINT.')
  }

  return encabezado
}

export async function obtenerEvint(
  evaluacionEvintId: number,
): Promise<EvintEncabezado | null> {
  const db = await obtenerBaseDatos()

  const filas = await db.select<EvintEncabezado[]>(
    `
      SELECT *
      FROM vw_evint_encabezado
      WHERE evaluacion_evint_id = $1
      LIMIT 1
    `,
    [evaluacionEvintId],
  )

  const fila = filas[0]

  if (!fila) {
    return null
  }

  return {
    ...fila,
    nombre_completo: nombreCompleto(
      fila.nombres,
      fila.apellido_paterno,
      fila.apellido_materno,
    ),
  }
}

export async function listarRespuestasEvint(
  evaluacionEvintId: number,
): Promise<RespuestaEvint[]> {
  const db = await obtenerBaseDatos()

  return db.select<RespuestaEvint[]>(
    `
      SELECT *
      FROM vw_evint_respuestas
      WHERE evaluacion_evint_id = $1
      ORDER BY
        area_orden,
        concepto_orden,
        factor_id
    `,
    [evaluacionEvintId],
  )
}

export async function listarConceptosEvint(
  evaluacionEvintId: number,
): Promise<ConceptoEvint[]> {
  const respuestas =
    await listarRespuestasEvint(evaluacionEvintId)

  const conceptos = new Map<number, ConceptoEvint>()

  for (const respuesta of respuestas) {
    let concepto = conceptos.get(respuesta.concepto_id)

    if (!concepto) {
      concepto = {
        area_id: respuesta.area_id,
        area_codigo: respuesta.area_codigo,
        area_nombre: respuesta.area_nombre,
        concepto_id: respuesta.concepto_id,
        concepto_numero: respuesta.concepto_numero,
        concepto_nombre: respuesta.concepto_nombre,
        concepto_descripcion:
          respuesta.concepto_descripcion,
        concepto_orden: respuesta.concepto_orden,
        respuestas: [],
      }

      conceptos.set(respuesta.concepto_id, concepto)
    }

    concepto.respuestas.push(respuesta)
  }

  return Array.from(conceptos.values())
}

export async function guardarRespuestaEvint(
  solicitud: GuardarRespuestaEvintRequest,
): Promise<void> {
  const db = await obtenerBaseDatos()

  await db.execute(
    `
      UPDATE respuestas_evint
      SET
        escala_id = $1,
        observacion = $2,
        actualizada_en = CURRENT_TIMESTAMP
      WHERE
        evaluacion_evint_id = $3
        AND factor_id = $4
    `,
    [
      solicitud.escalaId,
      solicitud.observacion?.trim() || null,
      solicitud.evaluacionEvintId,
      solicitud.factorId,
    ],
  )
}

export async function calcularEvint(
  evaluacionEvintId: number,
): Promise<ResultadoCalculoEvint> {
  const db = await obtenerBaseDatos()

  const filas = await db.select<Array<{
    concepto_id: number
    concepto_numero: number
    concepto_codigo: string
    concepto_nombre: string
    concepto_orden: number

    suma_valores: number | null
    total_descriptores: number | null
    total_evaluados: number | null
    total_no_observados: number | null

    nota_evint: number | null
  }>>(
    `
      SELECT
        vr.concepto_id,
        vr.concepto_numero,
        vr.concepto_codigo,
        vr.concepto_nombre,
        vr.concepto_orden,

        COALESCE(
          SUM(
            CASE
              WHEN vr.escala_valor > 0
                THEN vr.escala_valor
              ELSE 0
            END
          ),
          0
        ) AS suma_valores,

        COUNT(vr.respuesta_id)
          AS total_descriptores,

        COALESCE(
          SUM(
            CASE
              WHEN vr.escala_valor > 0
                THEN 1
              ELSE 0
            END
          ),
          0
        ) AS total_evaluados,

        COALESCE(
          SUM(
            CASE
              WHEN vr.escala_codigo = 'NO_OBSERVADO'
                THEN 1
              ELSE 0
            END
          ),
          0
        ) AS total_no_observados,

        CASE
          WHEN SUM(
            CASE
              WHEN vr.escala_valor > 0
                THEN 1
              ELSE 0
            END
          ) = 0
          THEN NULL
          ELSE ROUND(
            SUM(
              CASE
                WHEN vr.escala_valor > 0
                  THEN vr.escala_valor
                ELSE 0
              END
            ) * 1.0
            /
            SUM(
              CASE
                WHEN vr.escala_valor > 0
                  THEN 1
                ELSE 0
              END
            ),
            2
          )
        END AS nota_evint

      FROM vw_evint_respuestas vr

      WHERE
        vr.evaluacion_evint_id = $1

      GROUP BY
        vr.concepto_id,
        vr.concepto_numero,
        vr.concepto_codigo,
        vr.concepto_nombre,
        vr.concepto_orden

      ORDER BY
        vr.concepto_orden,
        vr.concepto_id
    `,
    [evaluacionEvintId],
  )

  const conceptos: ResultadoConceptoEvint[] =
    filas.map(fila => ({
      conceptoId:
        Number(fila.concepto_id),

      conceptoNumero:
        Number(fila.concepto_numero),

      conceptoCodigo:
        fila.concepto_codigo,

      conceptoNombre:
        fila.concepto_nombre,

      conceptoOrden:
        Number(fila.concepto_orden),

      sumaValores:
        Number(fila.suma_valores ?? 0),

      totalDescriptores:
        Number(fila.total_descriptores ?? 0),

      totalEvaluados:
        Number(fila.total_evaluados ?? 0),

      totalNoObservados:
        Number(fila.total_no_observados ?? 0),

      notaEvint:
        fila.nota_evint === null
          ? null
          : Number(fila.nota_evint),
    }))

  const totalFactores =
    conceptos.reduce(
      (acumulado, concepto) =>
        acumulado +
        concepto.totalDescriptores,
      0,
    )

  const totalEvaluados =
    conceptos.reduce(
      (acumulado, concepto) =>
        acumulado +
        concepto.totalEvaluados,
      0,
    )

  const totalNoObservados =
    conceptos.reduce(
      (acumulado, concepto) =>
        acumulado +
        concepto.totalNoObservados,
      0,
    )

  const conceptosConNota =
    conceptos.filter(
      concepto =>
        concepto.notaEvint !== null,
    )

  const promedio =
    conceptosConNota.length === 0
      ? null
      : Number(
          (
            conceptosConNota.reduce(
              (acumulado, concepto) =>
                acumulado +
                (concepto.notaEvint ?? 0),
              0,
            )
            /
            conceptosConNota.length
          ).toFixed(2),
        )

  return {
    promedio,
    totalFactores,
    totalEvaluados,
    totalNoObservados,
    conceptos,
  }
}

export async function guardarEvint(
  solicitud: GuardarEvintRequest,
): Promise<ResultadoCalculoEvint> {
  const db = await obtenerBaseDatos()
  const calculo = await calcularEvint(
    solicitud.evaluacionEvintId,
  )
  await guardarResultadosConceptosEvint(
    solicitud.evaluacionEvintId,
    calculo.conceptos,
  )

  await db.execute(
    `
      UPDATE evaluaciones_evint
      SET
        fecha_evaluacion = $1,
        observacion_general = $2,
        promedio = $3,
        total_factores = $4,
        total_evaluados = $5,
        total_no_observados = $6,
        realiza_evint = $7,
        justificacion_siempre = $8,
        justificacion_casi_nunca = $9,
        justificacion_no_observado = $10,
        justificacion_isa = $11,
        recursos = $12,
        fecha_toma_conocimiento = $13,
        firma_calificado = $14,
        firma_calificador = $15,
        tipo_recurso = $16,
        fecha_presentacion_recurso = $17,
        decision_calificador_directo = $18,
        fecha_decision_calificador_directo = $19,
        decision_calificador_superior = $20,
        fecha_decision_calificador_superior = $21,
        actualizada_en = CURRENT_TIMESTAMP
      WHERE id = $22
    `,
    [
      solicitud.fechaEvaluacion,
      solicitud.observacionGeneral?.trim() || null,
      calculo.promedio,
      calculo.totalFactores,
      calculo.totalEvaluados,
      calculo.totalNoObservados,
      solicitud.realizaEvint ? 1 : 0,
      solicitud.justificacionSiempre?.trim() || null,
      solicitud.justificacionCasiNunca?.trim() || null,
      solicitud.justificacionNoObservado?.trim() || null,
      solicitud.justificacionIsa?.trim() || null,
      solicitud.recursos?.trim() || null,
      solicitud.fechaTomaConocimiento || null,
      solicitud.firmaCalificado?.trim() || null,
      solicitud.firmaCalificador?.trim() || null,
      solicitud.tipoRecurso || null,
      solicitud.fechaPresentacionRecurso || null,
      solicitud.decisionCalificadorDirecto || null,
      solicitud.fechaDecisionCalificadorDirecto || null,
      solicitud.decisionCalificadorSuperior || null,
      solicitud.fechaDecisionCalificadorSuperior || null,
      solicitud.evaluacionEvintId,
    ],
  )

  return calculo
}

export async function completarEvint(
  evaluacionEvintId: number,
): Promise<ResultadoCalculoEvint> {
  const db = await obtenerBaseDatos()

  const pendientes = await db.select<Array<{ total: number }>>(
    `
      SELECT COUNT(*) AS total
      FROM respuestas_evint
      WHERE
        evaluacion_evint_id = $1
        AND escala_id IS NULL
    `,
    [evaluacionEvintId],
  )

  if ((pendientes[0]?.total ?? 0) > 0) {
    throw new Error(
      'Debe evaluar todos los factores antes de completar la EVINT.',
    )
  }

  const calculo = await calcularEvint(evaluacionEvintId)

  if (calculo.totalEvaluados === 0) {
    throw new Error(
      'La EVINT no contiene factores evaluados con puntaje.',
    )
  }

  await guardarResultadosConceptosEvint(
    evaluacionEvintId,
    calculo.conceptos,
  )

  await db.execute(
    `
      UPDATE evaluaciones_evint
      SET
        estado = 'COMPLETADA',
        promedio = $1,
        total_factores = $2,
        total_evaluados = $3,
        total_no_observados = $4,
        completada_en = CURRENT_TIMESTAMP,
        actualizada_en = CURRENT_TIMESTAMP
      WHERE id = $5
    `,
    [
      calculo.promedio,
      calculo.totalFactores,
      calculo.totalEvaluados,
      calculo.totalNoObservados,
      evaluacionEvintId,
    ],
  )

  await db.execute(
    `
      UPDATE instrumentos_expediente
      SET
        estado = 'COMPLETADO',
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT instrumento_id
        FROM evaluaciones_evint
        WHERE id = $1
      )
    `,
    [evaluacionEvintId],
  )

  return calculo
}

async function guardarResultadosConceptosEvint(
  evaluacionEvintId: number,
  conceptos: ResultadoConceptoEvint[],
): Promise<void> {
  const db = await obtenerBaseDatos()

  for (const concepto of conceptos) {
    const conceptoId =
      Number(concepto.conceptoId)

    const sumaValores =
      Number(concepto.sumaValores ?? 0)

    const totalDescriptores =
      Number(concepto.totalDescriptores ?? 0)

    const totalEvaluados =
      Number(concepto.totalEvaluados ?? 0)

    const totalNoObservados =
      Number(concepto.totalNoObservados ?? 0)

    const notaEvint =
      concepto.notaEvint === null ||
      concepto.notaEvint === undefined
        ? null
        : Number(concepto.notaEvint)

    if (!Number.isInteger(conceptoId) || conceptoId <= 0) {
      throw new Error(
        'No fue posible guardar el resultado de un concepto EVINT inválido.',
      )
    }

    await db.execute(
      `
        INSERT INTO resultados_concepto_evint (
          evaluacion_evint_id,
          concepto_id,
          suma_valores,
          total_descriptores,
          total_evaluados,
          total_no_observados,
          nota_evint
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7
        )
        ON CONFLICT(
          evaluacion_evint_id,
          concepto_id
        )
        DO UPDATE SET
          suma_valores =
            excluded.suma_valores,

          total_descriptores =
            excluded.total_descriptores,

          total_evaluados =
            excluded.total_evaluados,

          total_no_observados =
            excluded.total_no_observados,

          nota_evint =
            excluded.nota_evint,

          actualizado_en =
            CURRENT_TIMESTAMP
      `,
      [
        evaluacionEvintId,
        conceptoId,
        sumaValores,
        totalDescriptores,
        totalEvaluados,
        totalNoObservados,
        notaEvint,
      ],
    )
  }
}
