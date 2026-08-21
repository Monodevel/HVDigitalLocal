import { obtenerBaseDatos } from './database'

export type SerieResolucion = '1530' | '6060'

export const SERIES_RESOLUCION: Array<{
  value: SerieResolucion
  label: string
}> = [
  { value: '1530', label: '1530' },
  { value: '6060', label: '6060' },
]

function validarSerie(valor: string): asserts valor is SerieResolucion {
  if (valor !== '1530' && valor !== '6060') {
    throw new Error('La serie de resolución seleccionada no es válida.')
  }
}

export async function asegurarSeriesResoluciones(): Promise<void> {
  const db = await obtenerBaseDatos()

  await db.execute(`
    CREATE TABLE IF NOT EXISTS configuracion_series_resolucion (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      prefijo TEXT NOT NULL DEFAULT '1530'
        CHECK (prefijo IN ('1530', '6060')),
      actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await db.execute(`
    INSERT INTO configuracion_series_resolucion (id, prefijo)
    VALUES (1, '1530')
    ON CONFLICT(id) DO NOTHING
  `)

  await db.execute(`
    INSERT INTO contadores_resolucion (prefijo, ultimo_correlativo)
    VALUES ('6060', 0)
    ON CONFLICT(prefijo) DO NOTHING
  `)

  /*
   * La aplicación es local y de un único usuario. La numeración efectiva
   * se corrige dentro de SQLite al pasar un borrador a EMITIDA. Se elimina
   * el índice histórico para evitar una colisión transitoria provocada por
   * el servicio antiguo, que calculaba inicialmente con la serie 1530.
   */
  await db.execute(`
    DROP INDEX IF EXISTS ux_resoluciones_documentales_correlativo
  `)

  await db.execute(`
    CREATE INDEX IF NOT EXISTS ix_resoluciones_documentales_serie_correlativo
    ON resoluciones_documentales(prefijo, correlativo)
    WHERE correlativo IS NOT NULL
  `)

  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS trg_resolucion_aplicar_serie_borrador
    AFTER INSERT ON resoluciones_documentales
    WHEN NEW.estado = 'BORRADOR'
    BEGIN
      UPDATE resoluciones_documentales
      SET prefijo = COALESCE(
        (SELECT prefijo FROM configuracion_series_resolucion WHERE id = 1),
        '1530'
      )
      WHERE id = NEW.id;
    END
  `)

  await db.execute(`
    CREATE TRIGGER IF NOT EXISTS trg_resolucion_corregir_correlativo_serie
    AFTER UPDATE OF estado ON resoluciones_documentales
    WHEN OLD.estado = 'BORRADOR' AND NEW.estado = 'EMITIDA'
    BEGIN
      UPDATE resoluciones_documentales
      SET
        correlativo = (
          SELECT COALESCE(MAX(r2.correlativo), 0) + 1
          FROM resoluciones_documentales r2
          WHERE r2.prefijo = NEW.prefijo
            AND r2.estado = 'EMITIDA'
            AND r2.id <> NEW.id
            AND r2.correlativo IS NOT NULL
        ),
        numero_visible = NEW.prefijo || '/' || (
          SELECT COALESCE(MAX(r3.correlativo), 0) + 1
          FROM resoluciones_documentales r3
          WHERE r3.prefijo = NEW.prefijo
            AND r3.estado = 'EMITIDA'
            AND r3.id <> NEW.id
            AND r3.correlativo IS NOT NULL
        ),
        actualizada_en = CURRENT_TIMESTAMP
      WHERE id = NEW.id;
    END
  `)
}

export async function obtenerSerieResolucionActual(): Promise<SerieResolucion> {
  await asegurarSeriesResoluciones()
  const db = await obtenerBaseDatos()
  const filas = await db.select<Array<{ prefijo: string }>>(`
    SELECT prefijo
    FROM configuracion_series_resolucion
    WHERE id = 1
    LIMIT 1
  `)

  const prefijo = filas[0]?.prefijo ?? '1530'
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
  await asegurarSeriesResoluciones()
  const db = await obtenerBaseDatos()

  await db.execute(`
    UPDATE configuracion_series_resolucion
    SET prefijo = $1, actualizado_en = CURRENT_TIMESTAMP
    WHERE id = 1
  `, [prefijo])

  const personaId = Number(contexto?.personaId ?? 0)
  const hojaVidaId = Number(contexto?.hojaVidaId ?? 0)

  if (personaId <= 0 || hojaVidaId <= 0) return

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
  await asegurarSeriesResoluciones()
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
