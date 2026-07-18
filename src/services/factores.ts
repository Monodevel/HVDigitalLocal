import type {
  ConceptoConFactores,
  ConceptoFactorFila,
  FactorCalificacion,
} from '../types/factores'

import {
  obtenerBaseDatos,
} from './database'

export async function listarFactoresPorConcepto(
  conceptoId: number,
): Promise<FactorCalificacion[]> {
  if (
    !Number.isInteger(conceptoId) ||
    conceptoId <= 0
  ) {
    throw new Error(
      'El concepto seleccionado no es válido.',
    )
  }

  const db = await obtenerBaseDatos()

  return db.select<FactorCalificacion[]>(
    `
      SELECT
        id,
        codigo,
        concepto_id,
        nombre,
        descripcion,
        orden
      FROM factores_calificacion
      WHERE
        concepto_id = $1
        AND activo = 1
      ORDER BY orden
    `,
    [conceptoId],
  )
}

export async function listarConceptosConFactores():
Promise<ConceptoConFactores[]> {
  const db = await obtenerBaseDatos()

  const filas = await db.select<ConceptoFactorFila[]>(
    `
      SELECT
        area_id,
        area_codigo,
        area_nombre,

        concepto_id,
        concepto_codigo,
        concepto_numero,
        concepto_nombre,
        concepto_descripcion,
        concepto_orden,

        factor_id,
        factor_codigo,
        factor_nombre,
        factor_descripcion,
        factor_orden

      FROM vw_conceptos_factores

      ORDER BY
        concepto_orden,
        factor_orden
    `,
  )

  const conceptos = new Map<
    number,
    ConceptoConFactores
  >()

  for (const fila of filas) {
    let concepto = conceptos.get(
      fila.concepto_id,
    )

    if (!concepto) {
      concepto = {
        area_id: fila.area_id,
        area_codigo: fila.area_codigo,
        area_nombre: fila.area_nombre,

        concepto_id: fila.concepto_id,
        concepto_codigo: fila.concepto_codigo,
        concepto_numero: fila.concepto_numero,
        concepto_nombre: fila.concepto_nombre,
        concepto_descripcion:
          fila.concepto_descripcion,
        concepto_orden: fila.concepto_orden,

        factores: [],
      }

      conceptos.set(
        fila.concepto_id,
        concepto,
      )
    }

    concepto.factores.push({
      id: fila.factor_id,
      codigo: fila.factor_codigo,
      concepto_id: fila.concepto_id,
      nombre: fila.factor_nombre,
      descripcion: fila.factor_descripcion,
      orden: fila.factor_orden,
    })
  }

  return Array.from(conceptos.values())
}

export async function contarFactores():
Promise<number> {
  const db = await obtenerBaseDatos()

  const resultado = await db.select<
    Array<{ total: number }>
  >(
    `
      SELECT COUNT(*) AS total
      FROM factores_calificacion
      WHERE activo = 1
    `,
  )

  return resultado[0]?.total ?? 0
}

export async function validarIntegridadFactores():
Promise<void> {
  const db = await obtenerBaseDatos()

  const resultado = await db.select<
    Array<{
      conceptos: number
      factores: number
    }>
  >(
    `
      SELECT
        (
          SELECT COUNT(*)
          FROM conceptos_calificacion
          WHERE activo = 1
        ) AS conceptos,

        (
          SELECT COUNT(*)
          FROM factores_calificacion
          WHERE activo = 1
        ) AS factores
    `,
  )

  const resumen = resultado[0]

  if (!resumen) {
    throw new Error(
      'No fue posible validar el catálogo de factores.',
    )
  }

  if (resumen.conceptos !== 9) {
    throw new Error(
      `Se esperaban 9 conceptos y se encontraron ${resumen.conceptos}.`,
    )
  }

  if (resumen.factores !== 33) {
    throw new Error(
      `Se esperaban 33 factores y se encontraron ${resumen.factores}.`,
    )
  }
}