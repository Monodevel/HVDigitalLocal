import type {
  AreaEvaluacion,
  CategoriaConConceptos,
  CategoriaPersonal,
  ConceptoCalificacion,
  ConceptoCategoria,
} from '../types/catalogos'

import {
  obtenerBaseDatos,
} from './database'


export async function listarAreasEvaluacion():
Promise<AreaEvaluacion[]> {
  const db = await obtenerBaseDatos()

  return db.select<AreaEvaluacion[]>(
    `
      SELECT
        id,
        codigo,
        nombre,
        descripcion,
        orden
      FROM areas_evaluacion
      WHERE activo = 1
      ORDER BY orden
    `,
  )
}

export async function listarConceptosCalificacion():
Promise<ConceptoCalificacion[]> {
  const db = await obtenerBaseDatos()

  return db.select<ConceptoCalificacion[]>(
    `
      SELECT
        c.id,
        c.codigo,
        c.numero,
        c.nombre,
        c.area_evaluacion_id,
        a.codigo AS area_codigo,
        a.nombre AS area_nombre,
        c.orden
      FROM conceptos_calificacion c
      INNER JOIN areas_evaluacion a
        ON a.id = c.area_evaluacion_id
      WHERE
        c.activo = 1
        AND a.activo = 1
      ORDER BY c.orden
    `,
  )
}

export async function listarCategoriasPersonal():
Promise<CategoriaPersonal[]> {
  const db = await obtenerBaseDatos()

  return db.select<CategoriaPersonal[]>(
    `
      SELECT
        id,
        codigo,
        nombre,
        cantidad_conceptos,
        orden,
        es_militar
      FROM categorias_personal
      WHERE activo = 1
      ORDER BY orden
    `,
  )
}

export async function listarConceptosPorCategoria(
  categoriaId: number,
): Promise<ConceptoCategoria[]> {
  if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
    throw new Error('La categoría seleccionada no es válida.')
  }

  const db = await obtenerBaseDatos()

  return db.select<ConceptoCategoria[]>(
    `
      SELECT
        cat.id AS categoria_id,
        cat.codigo AS categoria_codigo,
        cat.nombre AS categoria_nombre,
        con.id AS concepto_id,
        con.codigo AS concepto_codigo,
        con.numero AS concepto_numero,
        con.nombre AS concepto_nombre,
        area.codigo AS area_codigo,
        area.nombre AS area_nombre,
        cc.orden
      FROM categoria_conceptos cc
      INNER JOIN categorias_personal cat
        ON cat.id = cc.categoria_id
      INNER JOIN conceptos_calificacion con
        ON con.id = cc.concepto_id
      INNER JOIN areas_evaluacion area
        ON area.id = con.area_evaluacion_id
      WHERE
        cc.categoria_id = $1
        AND cc.activo = 1
        AND cat.activo = 1
        AND con.activo = 1
        AND area.activo = 1
      ORDER BY cc.orden
    `,
    [categoriaId],
  )
}

export async function obtenerCategoriasConConceptos():
Promise<CategoriaConConceptos[]> {
  const categorias = await listarCategoriasPersonal()

  return Promise.all(
    categorias.map(async (categoria) => ({
      ...categoria,
      conceptos: await listarConceptosPorCategoria(
        categoria.id,
      ),
    })),
  )
}