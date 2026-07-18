import type {
  CrearResolucionAnotacionRequest,
  ResolucionAnotacion,
} from '../types/resoluciones'
import { obtenerBaseDatos } from './database'

export async function listarResolucionesDisponibles(
  hojaVidaId: number,
  tipoEfectoCodigo?: 'MERITO' | 'DEMERITO',
): Promise<ResolucionAnotacion[]> {
  const db = await obtenerBaseDatos()
  const parametros: Array<number | string> = [hojaVidaId]
  let filtro = ''

  if (tipoEfectoCodigo) {
    parametros.push(tipoEfectoCodigo)
    filtro = `AND tipo_efecto_codigo = $${parametros.length}`
  }

  return db.select<ResolucionAnotacion[]>(
    `SELECT *
     FROM vw_resoluciones_anotacion_disponibles
     WHERE hoja_vida_id = $1
       AND estado = 'DISPONIBLE'
       ${filtro}
     ORDER BY fecha DESC, id DESC`,
    parametros,
  )
}

export async function crearResolucionAnotacion(
  solicitud: CrearResolucionAnotacionRequest,
): Promise<number> {
  if (!solicitud.numero.trim()) {
    throw new Error('Debe indicar el número de la resolución.')
  }

  if (!solicitud.fecha) {
    throw new Error('Debe indicar la fecha de la resolución.')
  }

  const db = await obtenerBaseDatos()

  const valida = await db.select<Array<{ total: number }>>(
    `SELECT COUNT(*) AS total
     FROM puntajes_anotacion p
     INNER JOIN tipos_efecto_anotacion te ON te.id = p.tipo_efecto_id
     WHERE p.id = $1
       AND te.codigo = $2
       AND p.activo = 1
       AND te.activo = 1`,
    [solicitud.puntajeId, solicitud.tipoEfectoCodigo],
  )

  if ((valida[0]?.total ?? 0) === 0) {
    throw new Error('El puntaje no corresponde al tipo de resolución.')
  }

  const resultado = await db.execute(
    `INSERT INTO resoluciones_anotacion (
       hoja_vida_id, numero, fecha, tipo_efecto_codigo,
       concepto_id, puntaje_id, asunto, observacion
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      solicitud.hojaVidaId,
      solicitud.numero.trim(),
      solicitud.fecha,
      solicitud.tipoEfectoCodigo,
      solicitud.conceptoId,
      solicitud.puntajeId,
      solicitud.asunto?.trim() || null,
      solicitud.observacion?.trim() || null,
    ],
  )

  if (resultado.lastInsertId === undefined) {
    throw new Error('No fue posible crear la resolución.')
  }

  return Number(resultado.lastInsertId)
}
