import type {
  ExpedienteDetalle,
  InstrumentoExpedienteDetalle,
  UltimaAnotacionExpediente,
} from '../types/expedienteDetalle'

import {
  obtenerBaseDatos,
} from './database'

export async function obtenerInstrumentoExpediente(
  expedienteId: number,
  tipoInstrumento: string,
  numero = 1,
): Promise<InstrumentoExpedienteDetalle | null> {
  const db = await obtenerBaseDatos()

  const filas =
    await db.select<
      InstrumentoExpedienteDetalle[]
    >(
      `
        SELECT *
        FROM vw_instrumentos_expediente_detalle
        WHERE
          expediente_id = $1
          AND tipo_instrumento = $2
          AND numero = $3
        LIMIT 1
      `,
      [
        expedienteId,
        tipoInstrumento,
        numero,
      ],
    )

  return filas[0] ?? null
}

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

export async function obtenerExpedienteDetalle(
  expedienteId: number,
): Promise<ExpedienteDetalle | null> {
  if (
    !Number.isInteger(expedienteId) ||
    expedienteId <= 0
  ) {
    throw new Error(
      'El identificador del expediente no es válido.',
    )
  }

  const db = await obtenerBaseDatos()

  const filas =
    await db.select<ExpedienteDetalle[]>(
      `
        SELECT *
        FROM vw_expediente_detalle
        WHERE expediente_id = $1
        LIMIT 1
      `,
      [expedienteId],
    )

  const expediente = filas[0]

  if (!expediente) {
    return null
  }

  return {
    ...expediente,
    persona_nombre_completo:
      nombreCompleto(
        expediente.nombres,
        expediente.apellido_paterno,
        expediente.apellido_materno,
      ),
    calificador_nombre_completo:
      nombreCompleto(
        expediente.calificador_nombres,
        expediente.calificador_apellido_paterno,
        expediente.calificador_apellido_materno,
      ),
  }
}

export async function listarInstrumentosExpediente(
  expedienteId: number,
): Promise<InstrumentoExpedienteDetalle[]> {
  const db = await obtenerBaseDatos()

  return db.select<InstrumentoExpedienteDetalle[]>(
    `
      SELECT *
      FROM vw_instrumentos_expediente_detalle
      WHERE expediente_id = $1
      ORDER BY
        CASE tipo_instrumento
          WHEN 'HOJA_VIDA' THEN 1
          WHEN 'EVINT' THEN 2
          WHEN 'HC1' THEN 3
          WHEN 'HC2' THEN 4
          WHEN 'HAM' THEN 5
          WHEN 'HAPSEM' THEN 6
          ELSE 99
        END,
        numero
    `,
    [expedienteId],
  )
}

export async function listarUltimasAnotacionesExpediente(
  expedienteId: number,
  limite = 5,
): Promise<UltimaAnotacionExpediente[]> {
  const db = await obtenerBaseDatos()

  return db.select<UltimaAnotacionExpediente[]>(
    `
      SELECT *
      FROM vw_ultimas_anotaciones_expediente
      WHERE expediente_id = $1
      ORDER BY
        fecha_anotacion DESC,
        anotacion_id DESC
      LIMIT $2
    `,
    [expedienteId, limite],
  )
}

export async function iniciarInstrumento(
  instrumentoId: number,
): Promise<void> {
  const db = await obtenerBaseDatos()

  await db.execute(
    `
      UPDATE instrumentos_expediente
      SET
        estado = CASE
          WHEN estado = 'NO_INICIADO'
            THEN 'EN_ELABORACION'
          ELSE estado
        END,
        fecha_apertura = COALESCE(
          fecha_apertura,
          CURRENT_DATE
        ),
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [instrumentoId],
  )
}
