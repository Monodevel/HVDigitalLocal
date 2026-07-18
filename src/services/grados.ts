import type {
  CalidadPersonal,
  Grado,
  GradoCalidad,
} from '../types/grados'

import {
  obtenerBaseDatos,
} from './database'


export async function listarGrados(): Promise<Grado[]> {
  const db = await obtenerBaseDatos()

  return db.select<Grado[]>(
    `
      SELECT
        g.id,
        g.codigo,
        g.abreviatura,
        g.nombre,
        g.categoria_id,
        c.codigo AS categoria_codigo,
        c.nombre AS categoria_nombre,
        g.orden_jerarquico,
        g.sujeto_calificacion,
        g.es_oficial,
        g.es_cuadro_permanente,
        g.es_tropa_profesional
      FROM grados g
      LEFT JOIN categorias_personal c
        ON c.id = g.categoria_id
      WHERE g.activo = 1
      ORDER BY g.orden_jerarquico
    `,
  )
}

export async function listarGradosCalificables():
Promise<Grado[]> {
  const db = await obtenerBaseDatos()

  return db.select<Grado[]>(
    `
      SELECT
        g.id,
        g.codigo,
        g.abreviatura,
        g.nombre,
        g.categoria_id,
        c.codigo AS categoria_codigo,
        c.nombre AS categoria_nombre,
        g.orden_jerarquico,
        g.sujeto_calificacion,
        g.es_oficial,
        g.es_cuadro_permanente,
        g.es_tropa_profesional
      FROM grados g
      INNER JOIN categorias_personal c
        ON c.id = g.categoria_id
      WHERE
        g.activo = 1
        AND g.sujeto_calificacion = 1
        AND c.activo = 1
      ORDER BY g.orden_jerarquico
    `,
  )
}

export async function listarCalidadesPersonal():
Promise<CalidadPersonal[]> {
  const db = await obtenerBaseDatos()

  return db.select<CalidadPersonal[]>(
    `
      SELECT
        cp.id,
        cp.codigo,
        cp.abreviatura,
        cp.nombre,
        cp.categoria_id,
        c.codigo AS categoria_codigo,
        c.nombre AS categoria_nombre,
        cp.sujeto_calificacion
      FROM calidades_personal cp
      INNER JOIN categorias_personal c
        ON c.id = cp.categoria_id
      WHERE
        cp.activo = 1
        AND c.activo = 1
      ORDER BY cp.id
    `,
  )
}

export async function listarGradosYCalidades():
Promise<GradoCalidad[]> {
  const db = await obtenerBaseDatos()

  return db.select<GradoCalidad[]>(
    `
      SELECT
        tipo,
        id,
        codigo,
        abreviatura,
        nombre,
        categoria_id,
        categoria_codigo,
        categoria_nombre,
        orden,
        sujeto_calificacion,
        activo
      FROM vw_grados_calidades
      WHERE activo = 1
      ORDER BY orden
    `,
  )
}

export async function obtenerGradosPorCategoria(
  categoriaId: number,
): Promise<Grado[]> {
  if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
    throw new Error('La categoría no es válida.')
  }

  const db = await obtenerBaseDatos()

  return db.select<Grado[]>(
    `
      SELECT
        g.id,
        g.codigo,
        g.abreviatura,
        g.nombre,
        g.categoria_id,
        c.codigo AS categoria_codigo,
        c.nombre AS categoria_nombre,
        g.orden_jerarquico,
        g.sujeto_calificacion,
        g.es_oficial,
        g.es_cuadro_permanente,
        g.es_tropa_profesional
      FROM grados g
      INNER JOIN categorias_personal c
        ON c.id = g.categoria_id
      WHERE
        g.categoria_id = $1
        AND g.activo = 1
        AND g.sujeto_calificacion = 1
      ORDER BY g.orden_jerarquico
    `,
    [categoriaId],
  )
}