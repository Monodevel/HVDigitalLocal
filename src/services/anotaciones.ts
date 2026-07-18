import type {
  CategoriaAnotacion,
  ColorAnotacion,
  PlantillaAnotacion,
  VariablePlantillaAnotacion,
  ConceptoOpcion,
  PlantillaAnotacionOperativa,
  PuntajeAnotacion,
  TipoEfectoAnotacion,
  ValoresPlantilla,
} from '../types/anotaciones'

import {
  obtenerBaseDatos,
} from './database'


export interface CrearBorradorAnotacionInput {
  plantilla: PlantillaAnotacion
  hojaVidaId: number
  fechaAnotacion: string
  valores: ValoresPlantilla
  tituloFinal: string
  cuerpoFinal: string
  resolucionDocumentalId?: number | null
  modoRedaccion?: string
}


export async function listarCategoriasAnotacion():
Promise<CategoriaAnotacion[]> {
  const db = await obtenerBaseDatos()

  return db.select<CategoriaAnotacion[]>(
    `
      SELECT id, codigo, nombre, orden
      FROM categorias_anotacion
      WHERE activo = 1
      ORDER BY orden
    `,
  )
}

export async function listarPlantillasAnotacion(
  categoriaId?: number,
  color?: ColorAnotacion,
): Promise<PlantillaAnotacion[]> {
  const db = await obtenerBaseDatos()

  const filtros: string[] = []
  const parametros: Array<number | string> = []

  if (categoriaId !== undefined) {
    parametros.push(categoriaId)
    filtros.push(`categoria_id = $${parametros.length}`)
  }

  if (color !== undefined) {
    parametros.push(color)
    filtros.push(`color_semantico = $${parametros.length}`)
  }

  const where = filtros.length > 0
    ? `WHERE ${filtros.join(' AND ')}`
    : ''

  return db.select<PlantillaAnotacion[]>(
    `
      SELECT *
      FROM vw_catalogo_anotaciones
      ${where}
      ORDER BY categoria_orden, orden
    `,
    parametros,
  )
}

export async function obtenerPlantillaAnotacion(
  plantillaId: number,
): Promise<PlantillaAnotacion | null> {
  if (!Number.isInteger(plantillaId) || plantillaId <= 0) {
    throw new Error('La plantilla seleccionada no es válida.')
  }

  const db = await obtenerBaseDatos()

  const resultado = await db.select<PlantillaAnotacion[]>(
    `
      SELECT *
      FROM vw_catalogo_anotaciones
      WHERE id = $1
      LIMIT 1
    `,
    [plantillaId],
  )

  return resultado[0] ?? null
}

export async function validarCatalogoAnotaciones():
Promise<void> {
  const db = await obtenerBaseDatos()

  const resultado = await db.select<
    Array<{
      categorias: number
      plantillas: number
      negras: number
      rojas: number
    }>
  >(
    `
      SELECT
        (SELECT COUNT(*) FROM categorias_anotacion WHERE activo = 1)
          AS categorias,
        (SELECT COUNT(*) FROM plantillas_anotacion WHERE activo = 1)
          AS plantillas,
        (SELECT COUNT(*) FROM plantillas_anotacion
          WHERE activo = 1 AND color_semantico = 'NEGRO')
          AS negras,
        (SELECT COUNT(*) FROM plantillas_anotacion
          WHERE activo = 1 AND color_semantico = 'ROJO')
          AS rojas
    `,
  )

  const resumen = resultado[0]

  if (!resumen) {
    throw new Error('No fue posible validar el catálogo de anotaciones.')
  }

  if (resumen.categorias !== 11) {
    throw new Error(
      `Se esperaban 11 categorías y se encontraron ${resumen.categorias}.`,
    )
  }

  if (resumen.plantillas !== 72) {
    throw new Error(
      `Se esperaban 72 plantillas y se encontraron ${resumen.plantillas}.`,
    )
  }
}

export async function listarVariablesPlantilla(
  plantillaId: number,
): Promise<VariablePlantillaAnotacion[]> {
  if (!Number.isInteger(plantillaId) || plantillaId <= 0) {
    throw new Error('La plantilla seleccionada no es válida.')
  }

  const db = await obtenerBaseDatos()

  return db.select<VariablePlantillaAnotacion[]>(
    `
      SELECT
        id,
        plantilla_id,
        plantilla_codigo,
        plantilla_nombre,
        codigo,
        etiqueta,
        tipo_dato,
        requerido,
        orden,
        opciones_json,
        ayuda
      FROM vw_variables_plantilla_anotacion
      WHERE plantilla_id = $1
      ORDER BY orden
    `,
    [plantillaId],
  )
}

export async function crearBorradorAnotacion(
  entrada: CrearBorradorAnotacionInput,
): Promise<number> {
  const {
    plantilla,
    hojaVidaId,
    fechaAnotacion,
    valores,
    tituloFinal,
    cuerpoFinal,
    resolucionDocumentalId = null,
    modoRedaccion = 'PLANTILLA',
  } = entrada

  if (!fechaAnotacion) {
    throw new Error('Debe indicar la fecha de la anotación.')
  }

  if (!Number.isInteger(hojaVidaId) || hojaVidaId <= 0) {
    throw new Error('Debe seleccionar una Hoja de Vida válida.')
  }

  const conceptoId = Number(valores.concepto_id)
  const puntajeId = Number(valores.puntaje_id)

  const conceptoIdNormalizado =
    Number.isInteger(conceptoId) && conceptoId > 0
      ? conceptoId
      : null

  const puntajeIdNormalizado =
    Number.isInteger(puntajeId) && puntajeId > 0
      ? puntajeId
      : null

  const db = await obtenerBaseDatos()

  const resultado = await db.execute(
    `
      INSERT INTO borradores_anotacion (
        plantilla_id,
        hoja_vida_id,
        fecha_anotacion,
        titulo_final,
        cuerpo_final,
        color_semantico,
        color_hex,
        valores_json,
        concepto_id,
        puntaje_id,
        resolucion_documental_id,
        modo_redaccion,
        estado,
        actualizado_en
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, 'borrador', CURRENT_TIMESTAMP
      )
    `,
    [
      plantilla.id,
      hojaVidaId,
      fechaAnotacion,
      tituloFinal,
      cuerpoFinal,
      plantilla.color_semantico,
      plantilla.color_hex,
      JSON.stringify(valores),
      conceptoIdNormalizado,
      puntajeIdNormalizado,
      resolucionDocumentalId,
      modoRedaccion,
    ],
  )

  if (resultado.lastInsertId === undefined) {
    throw new Error('No fue posible obtener el borrador creado.')
  }

  return Number(resultado.lastInsertId)
}

export async function actualizarBorradorAnotacion(
  borradorId: number,
  fechaAnotacion: string,
  valores: ValoresPlantilla,
  tituloFinal: string,
  cuerpoFinal: string,
  resolucionDocumentalId?: number | null,
): Promise<void> {
  const db = await obtenerBaseDatos()

  const conceptoId = Number(valores.concepto_id)
  const puntajeId = Number(valores.puntaje_id)

  const conceptoIdNormalizado =
    Number.isInteger(conceptoId) && conceptoId > 0
      ? conceptoId
      : null

  const puntajeIdNormalizado =
    Number.isInteger(puntajeId) && puntajeId > 0
      ? puntajeId
      : null

  await db.execute(
    `
      UPDATE borradores_anotacion
      SET
        fecha_anotacion = $1,
        titulo_final = $2,
        cuerpo_final = $3,
        valores_json = $4,
        concepto_id = $5,
        puntaje_id = $6,
        resolucion_documental_id = $7,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $8 AND estado = 'borrador'
    `,
    [
      fechaAnotacion,
      tituloFinal,
      cuerpoFinal,
      JSON.stringify(valores),
      conceptoIdNormalizado,
      puntajeIdNormalizado,
      resolucionDocumentalId ?? null,
      borradorId,
    ],
  )
}

export async function listarPlantillasOperativas(
  categoriaId?: number,
): Promise<PlantillaAnotacionOperativa[]> {
  const db = await obtenerBaseDatos()

  if (categoriaId === undefined) {
    return db.select<PlantillaAnotacionOperativa[]>(
      `
        SELECT *
        FROM vw_plantillas_anotacion_operativas
        ORDER BY categoria_orden, orden
      `,
    )
  }

  return db.select<PlantillaAnotacionOperativa[]>(
    `
      SELECT *
      FROM vw_plantillas_anotacion_operativas
      WHERE categoria_id = $1
      ORDER BY orden
    `,
    [categoriaId],
  )
}

export async function listarPuntajesPorEfecto(
  tipoEfecto: TipoEfectoAnotacion,
): Promise<PuntajeAnotacion[]> {
  const db = await obtenerBaseDatos()

  return db.select<PuntajeAnotacion[]>(
    `
      SELECT
        p.id,
        p.codigo,
        p.tipo_efecto_id,
        te.codigo AS tipo_efecto_codigo,
        p.valor_centecimas,
        p.valor_decimal,
        p.texto_visual,
        p.texto_literal,
        p.orden
      FROM puntajes_anotacion p
      INNER JOIN tipos_efecto_anotacion te
        ON te.id = p.tipo_efecto_id
      WHERE
        te.codigo = $1
        AND p.activo = 1
        AND te.activo = 1
      ORDER BY p.orden
    `,
    [tipoEfecto],
  )
}

export async function listarConceptosComoOpciones():
Promise<ConceptoOpcion[]> {
  const db = await obtenerBaseDatos()

  const conceptos = await db.select<
    Array<{
      id: number
      numero: number
      codigo: string
      nombre: string
    }>
  >(
    `
      SELECT id, numero, codigo, nombre
      FROM conceptos_calificacion
      WHERE activo = 1
      ORDER BY numero
    `,
  )

  return conceptos.map(concepto => ({
    ...concepto,
    etiqueta: `Concepto N.º ${concepto.numero} “${concepto.nombre}”`,
  }))
}
