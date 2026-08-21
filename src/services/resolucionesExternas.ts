import { obtenerBaseDatos } from './database'
import type { CrearResolucionExternaInput, TipoEfectoResolucion } from '../types/resolucionesDocumentales'

function validarId(valor: number, nombre: string): void {
  if (!Number.isInteger(valor) || valor <= 0) throw new Error(`${nombre} no es válido.`)
}

function requerido(valor: string, nombre: string): string {
  const limpio = valor.trim()
  if (!limpio) throw new Error(`Debe indicar ${nombre}.`)
  return limpio
}

async function asegurarEsquema(): Promise<void> {
  const db = await obtenerBaseDatos()
  const columnas = await db.select<Array<{ name: string }>>('PRAGMA table_info(resoluciones_documentales)')
  const nombres = new Set(columnas.map(c => c.name))

  if (!nombres.has('origen_documento')) {
    await db.execute("ALTER TABLE resoluciones_documentales ADD COLUMN origen_documento TEXT NOT NULL DEFAULT 'INTERNA' CHECK (origen_documento IN ('INTERNA','EXTERNA'))")
  }
  if (!nombres.has('organismo_emisor')) {
    await db.execute('ALTER TABLE resoluciones_documentales ADD COLUMN organismo_emisor TEXT')
  }

  await db.execute('DROP VIEW IF EXISTS vw_resoluciones_emitidas_disponibles')
  await db.execute('DROP VIEW IF EXISTS vw_resoluciones_documentales')
  await db.execute(`
    CREATE VIEW vw_resoluciones_documentales AS
    SELECT r.id AS resolucion_id, r.hoja_vida_id, r.persona_id, r.tipo_efecto_codigo,
      r.prefijo, r.correlativo, r.numero_visible, r.fecha_documento,
      r.concepto_id, r.puntaje_id, r.asunto, r.antecedente_principal,
      r.resuelvo_principal, r.resuelvo_anotacion, r.cierre,
      r.firmante_nombre, r.firmante_grado, r.firmante_cargo,
      r.estado, r.anotacion_id, r.emitida_en, r.anulada_en, r.motivo_anulacion,
      r.creada_en, r.actualizada_en, r.origen_documento, r.organismo_emisor,
      p.run, p.nombres, p.apellido_paterno, p.apellido_materno,
      TRIM(COALESCE(g.abreviatura, cp.abreviatura, '') || ' ' || p.nombres || ' ' || p.apellido_paterno || ' ' || COALESCE(p.apellido_materno, '')) AS persona_nombre_completo,
      COALESCE(g.abreviatura, cp.abreviatura) AS grado_calidad_abreviatura,
      c.numero AS concepto_numero_actual, c.nombre AS concepto_nombre_actual,
      pa.texto_visual AS puntaje_visual_actual, pa.texto_literal AS puntaje_literal_actual
    FROM resoluciones_documentales r
    INNER JOIN personas p ON p.id = r.persona_id
    INNER JOIN hojas_vida hv ON hv.id = r.hoja_vida_id
    LEFT JOIN grados g ON g.id = hv.grado_id_inicio
    LEFT JOIN calidades_personal cp ON cp.id = hv.calidad_personal_id_inicio
    INNER JOIN conceptos_calificacion c ON c.id = r.concepto_id
    INNER JOIN puntajes_anotacion pa ON pa.id = r.puntaje_id
  `)
  await db.execute(`CREATE VIEW vw_resoluciones_emitidas_disponibles AS SELECT * FROM vw_resoluciones_documentales WHERE estado = 'EMITIDA' AND anotacion_id IS NULL`)
}

export async function crearResolucionExterna(entrada: CrearResolucionExternaInput): Promise<number> {
  await asegurarEsquema()
  validarId(entrada.hojaVidaId, 'La Hoja de Vida')
  validarId(entrada.personaId, 'La persona')
  validarId(entrada.conceptoId, 'El concepto')
  validarId(entrada.puntajeId, 'El puntaje')

  const numero = requerido(entrada.numeroDocumento, 'el número de la resolución externa')
  const organismo = requerido(entrada.organismoEmisor, 'el organismo o escalón emisor')
  const texto = requerido(entrada.textoResolucion, 'el texto o extracto de la resolución')
  const textoAnotacion = requerido(entrada.resuelvoAnotacion, 'el texto de la anotación')
  if (!entrada.fechaDocumento) throw new Error('Debe indicar la fecha de la resolución externa.')

  const db = await obtenerBaseDatos()
  const hoja = await db.select<Array<{ total: number }>>('SELECT COUNT(*) AS total FROM hojas_vida WHERE id = $1 AND persona_id = $2', [entrada.hojaVidaId, entrada.personaId])
  if (Number(hoja[0]?.total ?? 0) !== 1) throw new Error('La Hoja de Vida no corresponde al calificado seleccionado.')

  const catalogo = await db.select<Array<{ concepto_numero: number; concepto_nombre: string; puntaje_visual: string; puntaje_literal: string; tipo_efecto_codigo: TipoEfectoResolucion }>>(`
    SELECT c.numero AS concepto_numero, c.nombre AS concepto_nombre,
      p.texto_visual AS puntaje_visual, p.texto_literal AS puntaje_literal,
      te.codigo AS tipo_efecto_codigo
    FROM conceptos_calificacion c
    CROSS JOIN puntajes_anotacion p
    INNER JOIN tipos_efecto_anotacion te ON te.id = p.tipo_efecto_id
    WHERE c.id = $1 AND p.id = $2 AND c.activo = 1 AND p.activo = 1 AND te.activo = 1
    LIMIT 1
  `, [entrada.conceptoId, entrada.puntajeId])

  const datosCatalogo = catalogo[0]
  if (!datosCatalogo) throw new Error('El concepto o puntaje seleccionado no está disponible.')
  if (datosCatalogo.tipo_efecto_codigo !== entrada.tipoEfectoCodigo) throw new Error('El puntaje seleccionado no corresponde al tipo de resolución externa.')

  const duplicadas = await db.select<Array<{ total: number }>>(`SELECT COUNT(*) AS total FROM resoluciones_documentales WHERE origen_documento = 'EXTERNA' AND UPPER(TRIM(numero_visible)) = UPPER(TRIM($1)) AND UPPER(TRIM(COALESCE(organismo_emisor,''))) = UPPER(TRIM($2)) AND persona_id = $3 AND estado <> 'ANULADA'`, [numero, organismo, entrada.personaId])
  if (Number(duplicadas[0]?.total ?? 0) > 0) throw new Error('Esta resolución externa ya se encuentra registrada para el calificado.')

  const correlativos = await db.select<Array<{ siguiente: number }>>(`SELECT CASE WHEN MIN(correlativo) IS NULL OR MIN(correlativo) >= 0 THEN -1 ELSE MIN(correlativo) - 1 END AS siguiente FROM resoluciones_documentales WHERE prefijo = 'EXTERNA'`)
  const correlativoTecnico = Number(correlativos[0]?.siguiente ?? -1)

  const resultado = await db.execute(`
    INSERT INTO resoluciones_documentales (
      hoja_vida_id, persona_id, tipo_efecto_codigo, prefijo, correlativo, numero_visible,
      fecha_documento, concepto_id, puntaje_id, asunto, antecedente_principal,
      resuelvo_principal, resuelvo_anotacion, firmante_nombre, firmante_grado, firmante_cargo,
      estado, concepto_numero_snapshot, concepto_nombre_snapshot, puntaje_visual_snapshot,
      puntaje_literal_snapshot, emitida_en, actualizada_en, origen_documento, organismo_emisor
    ) VALUES ($1,$2,$3,'EXTERNA',$4,$5,$6,$7,$8,$9,$10,$11,$12,NULL,NULL,NULL,'EMITIDA',$13,$14,$15,$16,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'EXTERNA',$17)
  `, [entrada.hojaVidaId, entrada.personaId, entrada.tipoEfectoCodigo, correlativoTecnico, numero,
    entrada.fechaDocumento, entrada.conceptoId, entrada.puntajeId, entrada.asunto?.trim() || null,
    `Resolución externa recibida de ${organismo}.`, texto, textoAnotacion,
    datosCatalogo.concepto_numero, datosCatalogo.concepto_nombre,
    datosCatalogo.puntaje_visual, datosCatalogo.puntaje_literal, organismo])

  if (resultado.lastInsertId === undefined) throw new Error('No fue posible registrar la resolución externa.')
  return Number(resultado.lastInsertId)
}
