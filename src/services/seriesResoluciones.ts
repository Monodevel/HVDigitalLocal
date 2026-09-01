import { obtenerBaseDatos } from './database'
import { apiJson } from '../web/api'

export type SerieResolucion = '1530' | '6060'

export const SERIES_RESOLUCION: Array<{ value: SerieResolucion; label: string }> = [
  { value: '1530', label: '1530' },
  { value: '6060', label: '6060' },
]

function validarSerie(valor: string): asserts valor is SerieResolucion {
  if (valor !== '1530' && valor !== '6060') {
    throw new Error('La serie de resolución seleccionada no es válida.')
  }
}

/** El esquema es responsabilidad exclusiva del backend MariaDB. */
export async function asegurarSeriesResoluciones(): Promise<void> {}

export async function obtenerSerieResolucionActual(): Promise<SerieResolucion> {
  const configuracion = await apiJson<{ serie_resolucion?: string }>('/configuracion/inicial')
  const prefijo = configuracion.serie_resolucion ?? '1530'
  validarSerie(prefijo)
  return prefijo
}

export async function seleccionarSerieResolucion(
  prefijo: SerieResolucion,
  contexto?: {
    personaId?: number | null
    hojaVidaId?: number | null
    fechaDocumento?: string | null
  },
): Promise<void> {
  validarSerie(prefijo)
  await apiJson('/configuracion/serie', {
    method: 'PUT',
    body: JSON.stringify({ prefijo }),
  })

  const personaId = Number(contexto?.personaId ?? 0)
  const hojaVidaId = Number(contexto?.hojaVidaId ?? 0)
  if (personaId <= 0 || hojaVidaId <= 0) return

  const db = await obtenerBaseDatos()
  const parametros: Array<string | number> = [personaId, hojaVidaId]
  let filtroFecha = ''
  if (contexto?.fechaDocumento) {
    filtroFecha = 'AND fecha_documento = $3'
    parametros.push(contexto.fechaDocumento)
  }

  const borradores = await db.select<Array<{ id: number }>>(`
    SELECT id
    FROM resoluciones_documentales
    WHERE persona_id = $1
      AND hoja_vida_id = $2
      AND estado = 'BORRADOR'
      ${filtroFecha}
    ORDER BY actualizada_en DESC, id DESC
    LIMIT 1
  `, parametros)

  const borradorId = borradores[0]?.id
  if (!borradorId) return
  await db.execute(`
    UPDATE resoluciones_documentales
    SET prefijo = $1, actualizada_en = CURRENT_TIMESTAMP
    WHERE id = $2 AND estado = 'BORRADOR'
  `, [prefijo, borradorId])
}

export async function obtenerSerieBorrador(
  personaId: number,
  hojaVidaId: number,
  fechaDocumento?: string | null,
): Promise<SerieResolucion | null> {
  const db = await obtenerBaseDatos()
  const parametros: Array<string | number> = [personaId, hojaVidaId]
  let filtroFecha = ''
  if (fechaDocumento) {
    filtroFecha = 'AND fecha_documento = $3'
    parametros.push(fechaDocumento)
  }

  const filas = await db.select<Array<{ prefijo: string }>>(`
    SELECT prefijo
    FROM resoluciones_documentales
    WHERE persona_id = $1
      AND hoja_vida_id = $2
      AND estado = 'BORRADOR'
      ${filtroFecha}
    ORDER BY actualizada_en DESC, id DESC
    LIMIT 1
  `, parametros)

  const prefijo = filas[0]?.prefijo
  if (!prefijo) return null
  validarSerie(prefijo)
  return prefijo
}
