import type {
  BorradorParaEstampar,
  ResultadoEstampadoAnotacion,
  ResultadoValidacionEstampado,
  SolicitudEstampadoAnotacion,
} from '../types/estampadoAnotaciones'

import {
  obtenerBaseDatos,
} from './database'


function obtenerIdDesdeJson(
  valoresJson: string,
  campo: string,
): number | null {
  try {
    const valores = JSON.parse(valoresJson) as Record<string, unknown>
    const valor = Number(valores[campo])

    return Number.isInteger(valor) && valor > 0
      ? valor
      : null
  } catch {
    return null
  }
}

async function obtenerBorrador(
  borradorId: number,
): Promise<BorradorParaEstampar | null> {
  const db = await obtenerBaseDatos()

  const resultado = await db.select<BorradorParaEstampar[]>(
    `
      SELECT
        b.id,
        b.plantilla_id,
        b.hoja_vida_id,
        b.fecha_anotacion,
        b.titulo_final,
        b.cuerpo_final,
        b.color_semantico,
        b.color_hex,
        b.valores_json,
        b.estado,
        b.concepto_id,
        b.puntaje_id,
        b.resolucion_documental_id,

        rd.numero_visible AS numero_resolucion,
        rd.fecha_documento AS fecha_resolucion,

        p.codigo AS plantilla_codigo,
        p.nombre AS plantilla_nombre,
        p.requiere_resolucion,

        te.codigo AS tipo_efecto_codigo,
        pe.permite_seleccionar_concepto,
        pe.permite_seleccionar_puntaje,
        pe.concepto_obligatorio,
        pe.puntaje_obligatorio,

        hv.estado AS hoja_estado,
        hv.categoria_id

      FROM borradores_anotacion b

      INNER JOIN plantillas_anotacion p
        ON p.id = b.plantilla_id

      INNER JOIN plantilla_efectos_anotacion pe
        ON pe.plantilla_id = p.id

      INNER JOIN tipos_efecto_anotacion te
        ON te.id = pe.tipo_efecto_id

      LEFT JOIN hojas_vida hv
        ON hv.id = b.hoja_vida_id

      LEFT JOIN resoluciones_documentales rd
        ON rd.id = b.resolucion_documental_id

      WHERE b.id = $1
      LIMIT 1
    `,
    [borradorId],
  )

  return resultado[0] ?? null
}

async function sincronizarConceptoYPuntaje(
  borrador: BorradorParaEstampar,
): Promise<BorradorParaEstampar> {
  const conceptoId =
    borrador.concepto_id ??
    obtenerIdDesdeJson(borrador.valores_json, 'concepto_id')

  const puntajeId =
    borrador.puntaje_id ??
    obtenerIdDesdeJson(borrador.valores_json, 'puntaje_id')

  if (
    conceptoId === borrador.concepto_id &&
    puntajeId === borrador.puntaje_id
  ) {
    return borrador
  }

  const db = await obtenerBaseDatos()

  await db.execute(
    `
      UPDATE borradores_anotacion
      SET
        concepto_id = $1,
        puntaje_id = $2,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $3
    `,
    [conceptoId, puntajeId, borrador.id],
  )

  return {
    ...borrador,
    concepto_id: conceptoId,
    puntaje_id: puntajeId,
  }
}

async function conceptoPerteneceACategoria(
  conceptoId: number,
  categoriaId: number,
): Promise<boolean> {
  const db = await obtenerBaseDatos()

  const resultado = await db.select<Array<{ total: number }>>(
    `
      SELECT COUNT(*) AS total
      FROM categoria_conceptos
      WHERE
        categoria_id = $1
        AND concepto_id = $2
        AND activo = 1
    `,
    [categoriaId, conceptoId],
  )

  return (resultado[0]?.total ?? 0) > 0
}

async function puntajeCoincideConEfecto(
  puntajeId: number,
  tipoEfecto: string,
): Promise<boolean> {
  const db = await obtenerBaseDatos()

  const resultado = await db.select<Array<{ total: number }>>(
    `
      SELECT COUNT(*) AS total
      FROM puntajes_anotacion p
      INNER JOIN tipos_efecto_anotacion te
        ON te.id = p.tipo_efecto_id
      WHERE
        p.id = $1
        AND te.codigo = $2
        AND p.activo = 1
        AND te.activo = 1
    `,
    [puntajeId, tipoEfecto],
  )

  return (resultado[0]?.total ?? 0) > 0
}


interface ResolucionDocumentalParaEstampado {
  resolucion_id: number
  hoja_vida_id: number
  tipo_efecto_codigo: 'MERITO' | 'DEMERITO'
  concepto_id: number
  puntaje_id: number
  numero_visible: string
  fecha_documento: string
  estado: 'BORRADOR' | 'EMITIDA' | 'ANULADA'
  anotacion_id: number | null
}


function requiereResolucionPorTipoEfecto(
  tipoEfectoCodigo: string | null | undefined,
): boolean {
  return tipoEfectoCodigo === 'MERITO' ||
    tipoEfectoCodigo === 'DEMERITO'
}

async function obtenerResolucionDocumentalDisponible(
  resolucionId: number,
): Promise<ResolucionDocumentalParaEstampado | null> {
  const db = await obtenerBaseDatos()

  const filas =
    await db.select<ResolucionDocumentalParaEstampado[]>(
      `
        SELECT
          resolucion_id,
          hoja_vida_id,
          tipo_efecto_codigo,
          concepto_id,
          puntaje_id,
          numero_visible,
          fecha_documento,
          estado,
          anotacion_id
        FROM vw_resoluciones_documentales
        WHERE resolucion_id = $1
        LIMIT 1
      `,
      [resolucionId],
    )

  return filas[0] ?? null
}

export async function validarEstampadoAnotacion(
  solicitud: SolicitudEstampadoAnotacion,
): Promise<ResultadoValidacionEstampado> {
  const errores: string[] = []
  const advertencias: string[] = []

  if (
    !Number.isInteger(solicitud.borradorId) ||
    solicitud.borradorId <= 0
  ) {
    return {
      valido: false,
      errores: ['El identificador del borrador no es válido.'],
      advertencias,
      computaCalificacion: false,
    }
  }

  let borrador = await obtenerBorrador(solicitud.borradorId)

  if (!borrador) {
    return {
      valido: false,
      errores: ['No se encontró el borrador solicitado.'],
      advertencias,
      computaCalificacion: false,
    }
  }

  borrador = await sincronizarConceptoYPuntaje(borrador)

  let resolucionDocumental: ResolucionDocumentalParaEstampado | null = null

  const requiereResolucion =
    requiereResolucionPorTipoEfecto(
      borrador.tipo_efecto_codigo,
    )

  if (requiereResolucion) {
    const resolucionId =
      solicitud.resolucionDocumentalId ??
      borrador.resolucion_documental_id

    if (!resolucionId) {
      errores.push(
        'Debe seleccionar una resolución emitida pendiente de estampar.',
      )
    } else {
      resolucionDocumental =
        await obtenerResolucionDocumentalDisponible(resolucionId)

      if (!resolucionDocumental) {
        errores.push('La resolución seleccionada no existe.')
      } else {
        if (resolucionDocumental.estado !== 'EMITIDA') {
          errores.push('La resolución seleccionada no está emitida.')
        }

        if (resolucionDocumental.anotacion_id !== null) {
          errores.push('La resolución seleccionada ya fue estampada.')
        }

        if (
          borrador.hoja_vida_id &&
          resolucionDocumental.hoja_vida_id !== borrador.hoja_vida_id
        ) {
          errores.push(
            'La resolución seleccionada no corresponde a esta Hoja de Vida.',
          )
        }
      }
    }
  }

  const conceptoEfectivoId =
    resolucionDocumental?.concepto_id ??
    borrador.concepto_id

  const puntajeEfectivoId =
    resolucionDocumental?.puntaje_id ??
    borrador.puntaje_id

  const tipoEfectoEfectivo =
    resolucionDocumental?.tipo_efecto_codigo ??
    borrador.tipo_efecto_codigo

  if (!['borrador', 'validado'].includes(borrador.estado)) {
    errores.push(
      `El borrador se encuentra en estado “${borrador.estado}”.`,
    )
  }

  if (!borrador.hoja_vida_id) {
    errores.push('El borrador no está vinculado a una Hoja de Vida.')
  }

  if (borrador.hoja_estado !== 'abierta') {
    errores.push('La Hoja de Vida debe encontrarse abierta.')
  }

  if (!borrador.titulo_final?.trim()) {
    errores.push('La anotación no tiene un título final.')
  }

  if (!borrador.cuerpo_final?.trim()) {
    errores.push('La anotación no tiene un cuerpo final.')
  }

  if (borrador.cuerpo_final?.includes('{{')) {
    errores.push('La anotación contiene campos sin completar.')
  }

  if (
    borrador.concepto_obligatorio === 1 &&
    !conceptoEfectivoId
  ) {
    errores.push('Debe seleccionar un concepto de calificación.')
  }

  if (
    borrador.puntaje_obligatorio === 1 &&
    !puntajeEfectivoId
  ) {
    errores.push('Debe seleccionar un puntaje.')
  }

  /*
   * Cuando la anotación viene desde una resolución documental,
   * la fuente oficial del concepto y del puntaje es la resolución
   * ya emitida. No se debe volver a validar contra la categoría de
   * la plantilla/borrador, porque eso puede bloquear una anotación
   * legítima con el mensaje:
   * “El concepto seleccionado no corresponde a la categoría de la Hoja de Vida”.
   *
   * La resolución ya está asociada a la Hoja de Vida y trae su concepto
   * y puntaje snapshot. Al estampar, esos datos se copian desde la
   * resolución, no desde campos libres del formulario.
   */
  if (
    !resolucionDocumental &&
    conceptoEfectivoId &&
    borrador.categoria_id
  ) {
    const pertenece = await conceptoPerteneceACategoria(
      conceptoEfectivoId,
      borrador.categoria_id,
    )

    if (!pertenece) {
      errores.push(
        'El concepto seleccionado no corresponde a la categoría de la Hoja de Vida.',
      )
    }
  }

  if (
    puntajeEfectivoId &&
    tipoEfectoEfectivo !== 'NEUTRA'
  ) {
    const coincide = await puntajeCoincideConEfecto(
      puntajeEfectivoId,
      tipoEfectoEfectivo,
    )

    if (!coincide) {
      errores.push(
        'El puntaje seleccionado no corresponde al tipo de anotación.',
      )
    }
  }

  if (resolucionDocumental) {
    if (
      borrador.tipo_efecto_codigo !== 'NEUTRA' &&
      resolucionDocumental.tipo_efecto_codigo !== borrador.tipo_efecto_codigo
    ) {
      errores.push(
        'La resolución seleccionada no corresponde al tipo de anotación.',
      )
    }
  }

  const computaCalificacion =
    tipoEfectoEfectivo !== 'NEUTRA' &&
    conceptoEfectivoId !== null &&
    puntajeEfectivoId !== null

  return {
    valido: errores.length === 0,
    errores,
    advertencias,
    computaCalificacion,
  }
}

export async function estamparAnotacion(
  solicitud: SolicitudEstampadoAnotacion,
): Promise<ResultadoEstampadoAnotacion> {
  const validacion = await validarEstampadoAnotacion(solicitud)

  if (!validacion.valido) {
    throw new Error(validacion.errores.join(' '))
  }

  const borrador = await obtenerBorrador(solicitud.borradorId)

  if (
    !borrador ||
    !borrador.hoja_vida_id ||
    !borrador.titulo_final ||
    !borrador.cuerpo_final
  ) {
    throw new Error(
      'El borrador no contiene todos los datos necesarios para ser estampado.',
    )
  }

  const borradorSincronizado =
    await sincronizarConceptoYPuntaje(borrador)

  const resolucionDocumentalId =
    solicitud.resolucionDocumentalId ??
    borradorSincronizado.resolucion_documental_id

  const resolucionDocumental =
    resolucionDocumentalId
      ? await obtenerResolucionDocumentalDisponible(
          resolucionDocumentalId,
        )
      : null

  const requiereResolucion =
    requiereResolucionPorTipoEfecto(
      borradorSincronizado.tipo_efecto_codigo,
    )

  if (
    requiereResolucion &&
    !resolucionDocumental
  ) {
    throw new Error(
      'Debe seleccionar una resolución emitida pendiente de estampar.',
    )
  }

  const conceptoFinalId =
    resolucionDocumental?.concepto_id ??
    borradorSincronizado.concepto_id

  const puntajeFinalId =
    resolucionDocumental?.puntaje_id ??
    borradorSincronizado.puntaje_id

  const resolucionFinalId =
    resolucionDocumental?.resolucion_id ?? null

  const numeroResolucionFinal =
    resolucionDocumental?.numero_visible ?? null

  const fechaResolucionFinal =
    resolucionDocumental?.fecha_documento ?? null

  const db = await obtenerBaseDatos()

  const existente = await db.select<Array<{ id: number }>>(
      `
        SELECT id
        FROM anotaciones
        WHERE borrador_id = $1
        LIMIT 1
      `,
      [borradorSincronizado.id],
  )

  if (existente.length > 0) {
    throw new Error('El borrador ya fue estampado anteriormente.')
  }

  if (resolucionDocumental) {
    await db.execute(
      `
        UPDATE borradores_anotacion
        SET
          concepto_id = $1,
          puntaje_id = $2,
          resolucion_documental_id = $3,
          actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $4
      `,
      [
        conceptoFinalId,
        puntajeFinalId,
        resolucionFinalId,
        borradorSincronizado.id,
      ],
    )
  }

  const resultado = await db.execute(
    `
      INSERT INTO anotaciones (
        borrador_id,
        hoja_vida_id,
        plantilla_id,
        concepto_id,
        puntaje_id,
        fecha_anotacion,
        titulo_final,
        cuerpo_final,
        color_semantico,
        color_hex,
        valores_json,
        origen,
        computa_calificacion,
        requiere_resolucion,
        resolucion_documental_id,
        numero_resolucion,
        fecha_resolucion,
        estado
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17, 'estampada'
      )
    `,
    [
      borradorSincronizado.id,
      borradorSincronizado.hoja_vida_id,
      borradorSincronizado.plantilla_id,
      conceptoFinalId,
      puntajeFinalId,
      borradorSincronizado.fecha_anotacion,
      borradorSincronizado.titulo_final,
      borradorSincronizado.cuerpo_final,
      borradorSincronizado.color_semantico,
      borradorSincronizado.color_hex,
      borradorSincronizado.valores_json,
      solicitud.origen,
      validacion.computaCalificacion ? 1 : 0,
      requiereResolucion ? 1 : 0,
      resolucionFinalId,
      numeroResolucionFinal,
      fechaResolucionFinal,
    ],
  )

  if (resultado.lastInsertId === undefined) {
    throw new Error('No fue posible obtener la anotación creada.')
  }

  if (resolucionDocumental) {
    await db.execute(
      `
        UPDATE resoluciones_documentales
        SET
          anotacion_id = $1,
          actualizada_en = CURRENT_TIMESTAMP
        WHERE
          id = $2
          AND estado = 'EMITIDA'
          AND anotacion_id IS NULL
      `,
      [
        Number(resultado.lastInsertId),
        resolucionDocumental.resolucion_id,
      ],
    )
  }

  await db.execute(
    `
      UPDATE borradores_anotacion
      SET
        estado = 'estampado',
        computa_calificacion = $1,
        origen = $2,
        actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $3
    `,
    [
      validacion.computaCalificacion ? 1 : 0,
      solicitud.origen,
      borradorSincronizado.id,
    ],
  )


  return {
    anotacionId: Number(resultado.lastInsertId),
    borradorId: borradorSincronizado.id,
    computaCalificacion:
      validacion.computaCalificacion,
  }
}
