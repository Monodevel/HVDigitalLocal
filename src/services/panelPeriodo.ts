import type {
  PanelPeriodoActivo,
  ResumenExpedientePeriodo,
} from '../types/panelPeriodo'

import {
  obtenerBaseDatos,
} from './database'

function construirNombre(
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

export async function obtenerPanelPeriodoActivo():
Promise<PanelPeriodoActivo | null> {
  const db = await obtenerBaseDatos()

  const filas = await db.select<PanelPeriodoActivo[]>(
    `
      SELECT *
      FROM vw_panel_periodo_activo
      LIMIT 1
    `,
  )

  const panel = filas[0]

  if (!panel) {
    return null
  }

  return {
    ...panel,
    calificador_nombre_completo:
      construirNombre(
        panel.calificador_nombres,
        panel.calificador_apellido_paterno,
        panel.calificador_apellido_materno,
      ),
  }
}

export async function listarResumenExpedientesPeriodo():
Promise<ResumenExpedientePeriodo[]> {
  const db = await obtenerBaseDatos()

  const filas =
    await db.select<ResumenExpedientePeriodo[]>(
      `
        SELECT *
        FROM vw_resumen_expedientes_periodo_activo
        ORDER BY
          apellido_paterno,
          apellido_materno,
          nombres
      `,
    )

  return filas.map(fila => ({
    ...fila,
    nombre_completo: construirNombre(
      fila.nombres,
      fila.apellido_paterno,
      fila.apellido_materno,
    ),
  }))
}
