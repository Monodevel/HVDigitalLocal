import type {
  AnotacionHojaVida,
  BorradorHojaVida,
  HojaVidaAbierta,
  HojaVidaResumen,
  PersonaConHojaVidaAbierta,
} from '../types/hojaVida'
import {
  obtenerBaseDatos,
} from './database'

function construirNombreCompleto(
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

function centecimasAVisual(
  valor: number,
): string {
  const signo = valor > 0 ? '+' : ''

  return `${signo}${(valor / 100)
    .toFixed(2)
    .replace('.', ',')}`
}

function validarHojaVidaId(
  hojaVidaId: number,
): void {
  if (
    !Number.isInteger(hojaVidaId)
    || hojaVidaId <= 0
  ) {
    throw new Error(
      'El identificador de la Hoja de Vida no es válido.',
    )
  }
}

export async function listarPersonasConHojaVidaAbierta():
Promise<PersonaConHojaVidaAbierta[]> {
  const db = await obtenerBaseDatos()

  const filas =
    await db.select<Array<{
      persona_id: number
      run: string
      nombres: string
      apellido_paterno: string
      apellido_materno: string | null
      grado_calidad_abreviatura: string
      grado_calidad_nombre: string
    }>>(
      `
        SELECT DISTINCT
          hv.persona_id,

          p.run,
          p.nombres,
          p.apellido_paterno,
          p.apellido_materno,

          COALESCE(
            g.abreviatura,
            cp.abreviatura,
            ''
          ) AS grado_calidad_abreviatura,

          COALESCE(
            g.nombre,
            cp.nombre,
            ''
          ) AS grado_calidad_nombre

        FROM hojas_vida hv

        INNER JOIN personas p
          ON p.id = hv.persona_id

        LEFT JOIN grados g
          ON g.id = hv.grado_id_inicio

        LEFT JOIN calidades_personal cp
          ON cp.id = hv.calidad_personal_id_inicio

        WHERE hv.estado = 'abierta'

        ORDER BY
          p.apellido_paterno,
          p.apellido_materno,
          p.nombres
      `,
    )

  return filas.map(fila => {
    const nombreCompleto =
      construirNombreCompleto(
        fila.nombres,
        fila.apellido_paterno,
        fila.apellido_materno,
      )

    const grado =
      fila.grado_calidad_abreviatura?.trim()
        ?? ''

    return {
      ...fila,

      persona_nombre_completo:
        nombreCompleto,

      nombre_completo:
        nombreCompleto,

      etiqueta: [
        grado,
        nombreCompleto,
        fila.run
          ? `RUN ${fila.run}`
          : '',
      ]
        .filter(Boolean)
        .join(' · '),
    }
  })
}

export async function listarHojasVidaAbiertasPorPersona(
  personaId: number,
): Promise<HojaVidaAbierta[]> {
  if (
    !Number.isInteger(personaId)
    || personaId <= 0
  ) {
    throw new Error(
      'La persona seleccionada no es válida.',
    )
  }

  const db = await obtenerBaseDatos()

  const filas =
    await db.select<Array<{
      hoja_vida_id: number
      persona_id: number
      periodo_id: number
      categoria_id: number

      fecha_inicio: string
      fecha_termino: string
      estado: 'abierta'

      run: string
      nombres: string
      apellido_paterno: string
      apellido_materno: string | null

      grado_calidad_abreviatura: string
      grado_calidad_nombre: string

      categoria_codigo: string
      categoria_nombre: string
      periodo_nombre: string
    }>>(
      `
        SELECT
          hv.id AS hoja_vida_id,
          hv.persona_id,
          hv.periodo_id,
          hv.categoria_id,

          hv.fecha_inicio,
          hv.fecha_termino,
          hv.estado,

          p.run,
          p.nombres,
          p.apellido_paterno,
          p.apellido_materno,

          COALESCE(
            g.abreviatura,
            cp.abreviatura,
            ''
          ) AS grado_calidad_abreviatura,

          COALESCE(
            g.nombre,
            cp.nombre,
            ''
          ) AS grado_calidad_nombre,

          c.codigo AS categoria_codigo,
          c.nombre AS categoria_nombre,

          per.nombre AS periodo_nombre

        FROM hojas_vida hv

        INNER JOIN personas p
          ON p.id = hv.persona_id

        LEFT JOIN grados g
          ON g.id = hv.grado_id_inicio

        LEFT JOIN calidades_personal cp
          ON cp.id = hv.calidad_personal_id_inicio

        INNER JOIN categorias_personal c
          ON c.id = hv.categoria_id

        INNER JOIN periodos per
          ON per.id = hv.periodo_id

        WHERE
          hv.persona_id = $1
          AND hv.estado = 'abierta'

        ORDER BY
          hv.fecha_inicio DESC,
          hv.id DESC
      `,
      [personaId],
    )

  return filas.map(fila => {
    const nombreCompleto =
      construirNombreCompleto(
        fila.nombres,
        fila.apellido_paterno,
        fila.apellido_materno,
      )

    const grado =
      fila.grado_calidad_abreviatura?.trim()
        ?? ''

    return {
      ...fila,

      persona_nombre_completo:
        nombreCompleto,

      nombre_completo:
        nombreCompleto,

      etiqueta: [
        fila.periodo_nombre,
        fila.categoria_nombre,
        `${fila.fecha_inicio} al ${fila.fecha_termino}`,
      ]
        .filter(Boolean)
        .join(' · '),

      grado_calidad_abreviatura:
        grado,
    }
  })
}

export async function obtenerHojaVidaResumen(
  hojaVidaId: number,
): Promise<HojaVidaResumen | null> {
  validarHojaVidaId(hojaVidaId)

  const db = await obtenerBaseDatos()

  const filas =
    await db.select<HojaVidaResumen[]>(
      `
        SELECT *
        FROM vw_hoja_vida_resumen
        WHERE hoja_vida_id = $1
        LIMIT 1
      `,
      [hojaVidaId],
    )

  const resumen = filas[0]

  if (!resumen) {
    return null
  }

  return {
    ...resumen,
    total_anotaciones:
      Number(resumen.total_anotaciones ?? 0),
    total_meritos:
      Number(resumen.total_meritos ?? 0),
    total_demeritos:
      Number(resumen.total_demeritos ?? 0),
    total_neutras:
      Number(resumen.total_neutras ?? 0),
    total_borradores:
      Number(resumen.total_borradores ?? 0),
    puntaje_acumulado_centecimas:
      Number(
        resumen.puntaje_acumulado_centecimas
        ?? 0,
      ),
    nombre_completo:
      construirNombreCompleto(
        resumen.nombres,
        resumen.apellido_paterno,
        resumen.apellido_materno,
      ),
    puntaje_acumulado_visual:
      centecimasAVisual(
        Number(
          resumen.puntaje_acumulado_centecimas
          ?? 0,
        ),
      ),
  }
}

export async function listarBorradoresHojaVida(
  hojaVidaId: number,
): Promise<BorradorHojaVida[]> {
  validarHojaVidaId(hojaVidaId)

  const db = await obtenerBaseDatos()

  return db.select<BorradorHojaVida[]>(
    `
      SELECT *
      FROM vw_borradores_hoja_vida
      WHERE
        hoja_vida_id = $1
        AND estado IN ('borrador', 'validado')
      ORDER BY
        fecha_anotacion ASC,
        borrador_id ASC
    `,
    [hojaVidaId],
  )
}

export async function listarAnotacionesHojaVida(
  hojaVidaId: number,
): Promise<AnotacionHojaVida[]> {
  validarHojaVidaId(hojaVidaId)

  const db = await obtenerBaseDatos()

  const filas =
    await db.select<AnotacionHojaVida[]>(
      `
        SELECT *
        FROM vw_anotaciones_hoja_vida
        WHERE
          hoja_vida_id = $1
          AND estado = 'estampada'
        ORDER BY
          fecha_anotacion ASC,
          anotacion_id ASC
      `,
      [hojaVidaId],
    )

  return filas.map(fila => ({
    ...fila,
    correlativo: Number(fila.correlativo),
    anotacion_id: Number(fila.anotacion_id),
    computa_calificacion:
      Number(fila.computa_calificacion),
    requiere_resolucion:
      Number(fila.requiere_resolucion),
    puntaje_centecimas:
      fila.puntaje_centecimas === null
        ? null
        : Number(fila.puntaje_centecimas),
  }))
}

export async function anularBorradorHojaVida(
  borradorId: number,
): Promise<void> {
  const db = await obtenerBaseDatos()

  const resultado = await db.execute(
    `
      UPDATE borradores_anotacion
      SET
        estado = 'anulado',
        actualizado_en = CURRENT_TIMESTAMP
      WHERE
        id = $1
        AND estado IN ('borrador', 'validado')
    `,
    [borradorId],
  )

  if (resultado.rowsAffected === 0) {
    throw new Error(
      'El borrador no existe o ya no puede anularse.',
    )
  }
}

export async function anularAnotacionHojaVida(
  anotacionId: number,
): Promise<void> {
  const db = await obtenerBaseDatos()

  const resultado = await db.execute(
    `
      UPDATE anotaciones
      SET estado = 'anulada'
      WHERE
        id = $1
        AND estado = 'estampada'
    `,
    [anotacionId],
  )

  if (resultado.rowsAffected === 0) {
    throw new Error(
      'La anotación no existe o ya no puede anularse.',
    )
  }
}

export async function obtenerUnidadSistema():
Promise<string> {
  const db = await obtenerBaseDatos()

  const filas = await db.select<
    Array<{
      unidad_nombre: string
    }>
  >(
    `
      SELECT unidad_nombre
      FROM configuracion
      WHERE id = 1
      LIMIT 1
    `,
  )

  return filas[0]?.unidad_nombre?.trim() || ''
}
