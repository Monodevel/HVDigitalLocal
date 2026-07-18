import {
  obtenerBaseDatos,
} from './database'

import type {
  ActualizarBorradorResolucionInput,
  CrearBorradorResolucionInput,
  EstadoResolucion,
  PuntoReglamentarioResolucion,
  PuntoResolucion,
  ResolucionDocumento,
  ResultadoEmisionResolucion,
  SeccionResolucion,
  TipoEfectoResolucion,
} from '../types/resolucionesDocumentales'

type BaseDatos = Awaited<ReturnType<typeof obtenerBaseDatos>>

interface ResolucionEstadoFila {
  id: number
  estado: EstadoResolucion
  prefijo: string
  correlativo: number | null
  numero_visible: string | null
}

interface CatalogoEmisionFila {
  concepto_numero: number
  concepto_nombre: string
  puntaje_visual: string
  puntaje_literal: string
  tipo_efecto_codigo: string
}

// SQLite en tauri-plugin-sql puede bloquearse si abrimos
// transacciones manuales desde el frontend mientras otras
// lecturas/escrituras siguen activas. Por eso este servicio
// evita BEGIN/COMMIT/ROLLBACK manuales.
const PREFIJO_RESOLUCION = '1530'

const SECCIONES: SeccionResolucion[] = [
  'VISTOS',
  'CONSIDERANDO',
  'RESUELVO',
  'DISTRIBUCION',
]

function validarId(
  valor: number,
  nombre: string,
): void {
  if (
    !Number.isInteger(valor) ||
    valor <= 0
  ) {
    throw new Error(
      `${nombre} no es válido.`,
    )
  }
}

function textoOpcional(
  valor?: string,
): string | null {
  const texto = valor?.trim() ?? ''
  return texto || null
}

function validarTipoEfecto(
  tipo: TipoEfectoResolucion,
): void {
  if (
    tipo !== 'MERITO' &&
    tipo !== 'DEMERITO'
  ) {
    throw new Error(
      'El tipo de resolución no es válido.',
    )
  }
}

function normalizarPuntos(
  puntos: PuntoResolucion[],
): PuntoResolucion[] {
  const resultado: PuntoResolucion[] = []

  for (const seccion of SECCIONES) {
    const puntosSeccion = puntos
      .filter(
        punto =>
          punto.seccion === seccion,
      )
      .map(punto => ({
        ...punto,
        texto: punto.texto.trim(),
      }))
      .filter(punto => punto.texto)
      .sort(
        (a, b) =>
          a.orden - b.orden,
      )

    puntosSeccion.forEach(
      (punto, indice) => {
        resultado.push({
          seccion,
          orden: indice + 1,
          texto: punto.texto,
          origen: punto.origen,
          obligatorio:
            punto.obligatorio,
          editable: punto.editable,
        })
      },
    )
  }

  return resultado
}

function validarEntrada(
  entrada:
    | CrearBorradorResolucionInput
    | ActualizarBorradorResolucionInput,
): void {
  validarId(
    entrada.hojaVidaId,
    'La Hoja de Vida seleccionada',
  )

  validarId(
    entrada.personaId,
    'La persona seleccionada',
  )

  validarId(
    entrada.conceptoId,
    'El concepto seleccionado',
  )

  validarId(
    entrada.puntajeId,
    'El puntaje seleccionado',
  )

  validarTipoEfecto(
    entrada.tipoEfectoCodigo,
  )

  if (!entrada.fechaDocumento) {
    throw new Error(
      'Debe indicar la fecha de la resolución.',
    )
  }

  if (
    !entrada.resuelvoPrincipal.trim()
  ) {
    throw new Error(
      'Debe indicar el texto principal del RESUELVO.',
    )
  }

  if (
    !entrada.resuelvoAnotacion.trim()
  ) {
    throw new Error(
      'No fue posible generar el texto de estampado de la anotación.',
    )
  }
}

async function validarHojaVidaPersona(
  hojaVidaId: number,
  personaId: number,
): Promise<void> {
  const db = await obtenerBaseDatos()

  const filas = await db.select<
    Array<{ total: number }>
  >(
    `
      SELECT COUNT(*) AS total
      FROM hojas_vida
      WHERE
        id = $1
        AND persona_id = $2
    `,
    [
      hojaVidaId,
      personaId,
    ],
  )

  if (
    Number(filas[0]?.total ?? 0) !== 1
  ) {
    throw new Error(
      'La Hoja de Vida no corresponde a la persona seleccionada.',
    )
  }
}

async function validarPuntajeEfecto(
  puntajeId: number,
  tipoEfecto: TipoEfectoResolucion,
): Promise<void> {
  const db = await obtenerBaseDatos()

  const filas = await db.select<
    Array<{ total: number }>
  >(
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
    [
      puntajeId,
      tipoEfecto,
    ],
  )

  if (
    Number(filas[0]?.total ?? 0) !== 1
  ) {
    throw new Error(
      'El puntaje seleccionado no corresponde al tipo de resolución.',
    )
  }
}

async function validarConceptoActivo(
  conceptoId: number,
): Promise<void> {
  const db = await obtenerBaseDatos()

  const filas = await db.select<
    Array<{ total: number }>
  >(
    `
      SELECT COUNT(*) AS total
      FROM conceptos_calificacion
      WHERE
        id = $1
        AND activo = 1
    `,
    [conceptoId],
  )

  if (
    Number(filas[0]?.total ?? 0) !== 1
  ) {
    throw new Error(
      'El concepto seleccionado no está disponible.',
    )
  }
}

async function insertarPuntos(
  db: BaseDatos,
  resolucionId: number,
  puntos: PuntoResolucion[],
): Promise<void> {
  for (const punto of puntos) {
    await db.execute(
      `
        INSERT INTO puntos_resolucion (
          resolucion_id,
          seccion,
          orden,
          texto,
          origen,
          obligatorio,
          editable
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
      `,
      [
        resolucionId,
        punto.seccion,
        punto.orden,
        punto.texto,
        punto.origen,
        punto.obligatorio,
        punto.editable,
      ],
    )
  }
}

async function obtenerEstadoResolucion(
  resolucionId: number,
): Promise<ResolucionEstadoFila | null> {
  const db = await obtenerBaseDatos()

  const filas =
    await db.select<ResolucionEstadoFila[]>(
      `
        SELECT
          id,
          estado,
          prefijo,
          correlativo,
          numero_visible
        FROM resoluciones_documentales
        WHERE id = $1
        LIMIT 1
      `,
      [resolucionId],
    )

  return filas[0] ?? null
}

export async function listarPuntosReglamentarios(
  tipoEfecto: TipoEfectoResolucion,
): Promise<PuntoReglamentarioResolucion[]> {
  validarTipoEfecto(tipoEfecto)

  const db = await obtenerBaseDatos()

  return db.select<
    PuntoReglamentarioResolucion[]
  >(
    `
      SELECT
        id,
        tipo_aplicacion,
        seccion,
        orden,
        texto,
        obligatorio,
        editable,
        activo
      FROM puntos_reglamentarios_resolucion
      WHERE
        activo = 1
        AND tipo_aplicacion IN (
          'TODAS',
          $1
        )
      ORDER BY
        CASE
          WHEN seccion = 'VISTOS'
            THEN 1
          WHEN seccion = 'CONSIDERANDO'
            THEN 2
          WHEN seccion = 'RESUELVO'
            THEN 3
          ELSE 4
        END,
        orden,
        id
    `,
    [tipoEfecto],
  )
}

export async function construirPuntosIniciales(
  tipoEfecto: TipoEfectoResolucion,
): Promise<PuntoResolucion[]> {
  const reglamentarios =
    await listarPuntosReglamentarios(
      tipoEfecto,
    )

  const puntos = reglamentarios.map(
    punto => ({
      seccion: punto.seccion,
      orden: punto.orden,
      texto: punto.texto,
      origen:
        'REGLAMENTARIO' as const,
      obligatorio:
        punto.obligatorio,
      editable: punto.editable,
    }),
  )

  return normalizarPuntos(puntos)
}

export async function crearBorradorResolucion(
  entrada: CrearBorradorResolucionInput,
): Promise<number> {
  validarEntrada(entrada)

  await validarHojaVidaPersona(
    entrada.hojaVidaId,
    entrada.personaId,
  )

  await validarConceptoActivo(
    entrada.conceptoId,
  )

  await validarPuntajeEfecto(
    entrada.puntajeId,
    entrada.tipoEfectoCodigo,
  )

  const puntos =
    normalizarPuntos(entrada.puntos)

  const vistosObligatorios =
    puntos.filter(
      punto =>
        punto.seccion === 'VISTOS' &&
        punto.obligatorio === 1,
    )

  if (
    vistosObligatorios.length === 0
  ) {
    throw new Error(
      'La resolución debe conservar los VISTOS reglamentarios obligatorios.',
    )
  }

  const db = await obtenerBaseDatos()

  try {
    const resultado = await db.execute(
      `
        INSERT INTO resoluciones_documentales (
          hoja_vida_id,
          persona_id,
          tipo_efecto_codigo,
          prefijo,
          correlativo,
          numero_visible,
          fecha_documento,
          concepto_id,
          puntaje_id,
          asunto,
          antecedente_principal,
          resuelvo_principal,
          resuelvo_anotacion,
          firmante_nombre,
          firmante_grado,
          firmante_cargo,
          estado,
          actualizada_en
        )
        VALUES (
          $1, $2, $3, $4,
          NULL,
          NULL,
          $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14,
          'BORRADOR',
          CURRENT_TIMESTAMP
        )
      `,
      [
        entrada.hojaVidaId,
        entrada.personaId,
        entrada.tipoEfectoCodigo,
        PREFIJO_RESOLUCION,
        entrada.fechaDocumento,
        entrada.conceptoId,
        entrada.puntajeId,
        textoOpcional(entrada.asunto),
        textoOpcional(
          entrada.antecedentePrincipal,
        ),
        entrada.resuelvoPrincipal.trim(),
        entrada.resuelvoAnotacion.trim(),
        textoOpcional(
          entrada.firmanteNombre,
        ),
        textoOpcional(
          entrada.firmanteGrado,
        ),
        textoOpcional(
          entrada.firmanteCargo,
        ),
      ],
    )

    if (
      resultado.lastInsertId ===
      undefined
    ) {
      throw new Error(
        'No fue posible obtener la resolución creada.',
      )
    }

    const resolucionId = Number(
      resultado.lastInsertId,
    )

    await insertarPuntos(
      db,
      resolucionId,
      puntos,
    )

    return resolucionId
  } catch (excepcion) {
    throw excepcion
  }
}

export async function actualizarBorradorResolucion(
  entrada: ActualizarBorradorResolucionInput,
): Promise<void> {
  validarId(
    entrada.resolucionId,
    'La resolución',
  )

  validarEntrada(entrada)

  const estado =
    await obtenerEstadoResolucion(
      entrada.resolucionId,
    )

  if (!estado) {
    throw new Error(
      'La resolución no existe.',
    )
  }

  if (estado.estado !== 'BORRADOR') {
    throw new Error(
      'Solo es posible modificar resoluciones en borrador.',
    )
  }

  await validarHojaVidaPersona(
    entrada.hojaVidaId,
    entrada.personaId,
  )

  await validarConceptoActivo(
    entrada.conceptoId,
  )

  await validarPuntajeEfecto(
    entrada.puntajeId,
    entrada.tipoEfectoCodigo,
  )

  const puntos =
    normalizarPuntos(entrada.puntos)

  const db = await obtenerBaseDatos()

  try {
    await db.execute(
      `
        UPDATE resoluciones_documentales
        SET
          hoja_vida_id = $1,
          persona_id = $2,
          tipo_efecto_codigo = $3,
          fecha_documento = $4,
          concepto_id = $5,
          puntaje_id = $6,
          asunto = $7,
          antecedente_principal = $8,
          resuelvo_principal = $9,
          resuelvo_anotacion = $10,
          firmante_nombre = $11,
          firmante_grado = $12,
          firmante_cargo = $13,
          actualizada_en =
            CURRENT_TIMESTAMP
        WHERE
          id = $14
          AND estado = 'BORRADOR'
      `,
      [
        entrada.hojaVidaId,
        entrada.personaId,
        entrada.tipoEfectoCodigo,
        entrada.fechaDocumento,
        entrada.conceptoId,
        entrada.puntajeId,
        textoOpcional(entrada.asunto),
        textoOpcional(
          entrada.antecedentePrincipal,
        ),
        entrada.resuelvoPrincipal.trim(),
        entrada.resuelvoAnotacion.trim(),
        textoOpcional(
          entrada.firmanteNombre,
        ),
        textoOpcional(
          entrada.firmanteGrado,
        ),
        textoOpcional(
          entrada.firmanteCargo,
        ),
        entrada.resolucionId,
      ],
    )

    await db.execute(
      `
        DELETE FROM puntos_resolucion
        WHERE resolucion_id = $1
      `,
      [entrada.resolucionId],
    )

    await insertarPuntos(
      db,
      entrada.resolucionId,
      puntos,
    )

  } catch (excepcion) {
    throw excepcion
  }
}

export async function obtenerResolucion(
  resolucionId: number,
): Promise<ResolucionDocumento | null> {
  validarId(
    resolucionId,
    'La resolución',
  )

  const db = await obtenerBaseDatos()

  const filas =
    await db.select<ResolucionDocumento[]>(
      `
        SELECT *
        FROM vw_resoluciones_documentales
        WHERE resolucion_id = $1
        LIMIT 1
      `,
      [resolucionId],
    )

  return filas[0] ?? null
}

export async function listarPuntosResolucion(
  resolucionId: number,
): Promise<PuntoResolucion[]> {
  validarId(
    resolucionId,
    'La resolución',
  )

  const db = await obtenerBaseDatos()

  return db.select<PuntoResolucion[]>(
    `
      SELECT
        id,
        resolucion_id,
        seccion,
        orden,
        texto,
        origen,
        obligatorio,
        editable
      FROM puntos_resolucion
      WHERE resolucion_id = $1
      ORDER BY
        CASE
          WHEN seccion = 'VISTOS'
            THEN 1
          WHEN seccion = 'CONSIDERANDO'
            THEN 2
          WHEN seccion = 'RESUELVO'
            THEN 3
          ELSE 4
        END,
        orden,
        id
    `,
    [resolucionId],
  )
}

export async function listarResoluciones(
  estado?: EstadoResolucion,
): Promise<ResolucionDocumento[]> {
  const db = await obtenerBaseDatos()

  if (!estado) {
    return db.select<
      ResolucionDocumento[]
    >(
      `
        SELECT *
        FROM vw_resoluciones_documentales
        ORDER BY
          CASE
            WHEN estado = 'BORRADOR'
              THEN 1
            WHEN estado = 'EMITIDA'
              THEN 2
            ELSE 3
          END,
          fecha_documento DESC,
          resolucion_id DESC
      `,
    )
  }

  return db.select<
    ResolucionDocumento[]
  >(
    `
      SELECT *
      FROM vw_resoluciones_documentales
      WHERE estado = $1
      ORDER BY
        fecha_documento DESC,
        resolucion_id DESC
    `,
    [estado],
  )
}

export async function listarResolucionesEmitidasDisponibles(
  hojaVidaId: number,
  tipoEfecto: TipoEfectoResolucion,
): Promise<ResolucionDocumento[]> {
  validarId(
    hojaVidaId,
    'La Hoja de Vida',
  )

  validarTipoEfecto(tipoEfecto)

  const db = await obtenerBaseDatos()

  return db.select<
    ResolucionDocumento[]
  >(
    `
      SELECT *
      FROM vw_resoluciones_emitidas_disponibles
      WHERE
        hoja_vida_id = $1
        AND tipo_efecto_codigo = $2
      ORDER BY
        correlativo DESC,
        resolucion_id DESC
    `,
    [
      hojaVidaId,
      tipoEfecto,
    ],
  )
}

export async function emitirResolucion(
  resolucionId: number,
): Promise<ResultadoEmisionResolucion> {
  validarId(
    resolucionId,
    'La resolución',
  )

  const db = await obtenerBaseDatos()

  const estados =
    await db.select<ResolucionEstadoFila[]>(
      `
        SELECT
          id,
          estado,
          prefijo,
          correlativo,
          numero_visible
        FROM resoluciones_documentales
        WHERE id = $1
        LIMIT 1
      `,
      [resolucionId],
    )

  const resolucion = estados[0]

  if (!resolucion) {
    throw new Error(
      'La resolución no existe.',
    )
  }

  if (resolucion.estado !== 'BORRADOR') {
    throw new Error(
      'Solo se pueden emitir resoluciones en borrador.',
    )
  }

  const puntos =
    await db.select<
      Array<{
        seccion: SeccionResolucion
        texto: string
        obligatorio: 0 | 1
      }>
    >(
      `
        SELECT
          seccion,
          texto,
          obligatorio
        FROM puntos_resolucion
        WHERE resolucion_id = $1
        ORDER BY seccion, orden
      `,
      [resolucionId],
    )

  const vistosObligatorios =
    puntos.filter(
      punto =>
        punto.seccion === 'VISTOS' &&
        punto.obligatorio === 1 &&
        punto.texto.trim(),
    )

  if (vistosObligatorios.length === 0) {
    throw new Error(
      'La resolución no contiene sus VISTOS reglamentarios.',
    )
  }

  const datos =
    await db.select<CatalogoEmisionFila[]>(
      `
        SELECT
          c.numero
            AS concepto_numero,
          c.nombre
            AS concepto_nombre,
          p.texto_visual
            AS puntaje_visual,
          p.texto_literal
            AS puntaje_literal,
          te.codigo
            AS tipo_efecto_codigo
        FROM resoluciones_documentales r
        INNER JOIN conceptos_calificacion c
          ON c.id = r.concepto_id
        INNER JOIN puntajes_anotacion p
          ON p.id = r.puntaje_id
        INNER JOIN tipos_efecto_anotacion te
          ON te.id = p.tipo_efecto_id
        WHERE r.id = $1
        LIMIT 1
      `,
      [resolucionId],
    )

  const catalogo = datos[0]

  if (!catalogo) {
    throw new Error(
      'No fue posible obtener el concepto y puntaje de la resolución.',
    )
  }

  const tipos =
    await db.select<
      Array<{
        tipo_efecto_codigo:
          TipoEfectoResolucion
      }>
    >(
      `
        SELECT tipo_efecto_codigo
        FROM resoluciones_documentales
        WHERE id = $1
        LIMIT 1
      `,
      [resolucionId],
    )

  const tipoResolucion =
    tipos[0]?.tipo_efecto_codigo

  if (
    catalogo.tipo_efecto_codigo !==
    tipoResolucion
  ) {
    throw new Error(
      'El puntaje no corresponde al tipo de resolución.',
    )
  }

  /*
   * IMPORTANTE:
   * No usamos la tabla contadores_resolucion aquí.
   * En tauri-plugin-sql, las transacciones manuales desde
   * TypeScript nos generaron bloqueos. Para esta aplicación
   * desktop local calculamos el siguiente correlativo desde
   * las resoluciones efectivamente EMITIDAS.
   *
   * Los borradores quedan fuera por diseño.
   */
  const correlativos =
    await db.select<
      Array<{
        siguiente_correlativo: number
      }>
    >(
      `
        SELECT
          COALESCE(MAX(correlativo), 0) + 1
            AS siguiente_correlativo
        FROM resoluciones_documentales
        WHERE
          prefijo = $1
          AND estado = 'EMITIDA'
          AND correlativo IS NOT NULL
      `,
      [PREFIJO_RESOLUCION],
    )

  const correlativo = Number(
    correlativos[0]
      ?.siguiente_correlativo ?? 1,
  )

  if (correlativo <= 0) {
    throw new Error(
      'No fue posible generar el correlativo de la resolución.',
    )
  }

  const numeroVisible =
    `${PREFIJO_RESOLUCION}/${correlativo}`

  await db.execute(
    `
      UPDATE resoluciones_documentales
      SET
        correlativo = $1,
        numero_visible = $2,
        concepto_numero_snapshot = $3,
        concepto_nombre_snapshot = $4,
        puntaje_visual_snapshot = $5,
        puntaje_literal_snapshot = $6,
        estado = 'EMITIDA',
        emitida_en = CURRENT_TIMESTAMP,
        actualizada_en = CURRENT_TIMESTAMP
      WHERE
        id = $7
        AND estado = 'BORRADOR'
        AND correlativo IS NULL
        AND numero_visible IS NULL
    `,
    [
      correlativo,
      numeroVisible,
      catalogo.concepto_numero,
      catalogo.concepto_nombre,
      catalogo.puntaje_visual,
      catalogo.puntaje_literal,
      resolucionId,
    ],
  )

  const emitidas =
    await db.select<
      Array<{
        emitida_en: string
        numero_visible: string
        correlativo: number
        estado: EstadoResolucion
      }>
    >(
      `
        SELECT
          emitida_en,
          numero_visible,
          correlativo,
          estado
        FROM resoluciones_documentales
        WHERE id = $1
        LIMIT 1
      `,
      [resolucionId],
    )

  const emitida = emitidas[0]

  if (
    !emitida ||
    emitida.estado !== 'EMITIDA' ||
    !emitida.emitida_en ||
    !emitida.numero_visible
  ) {
    throw new Error(
      'No fue posible completar la emisión de la resolución.',
    )
  }

  return {
    resolucionId,
    correlativo: Number(
      emitida.correlativo,
    ),
    numeroVisible:
      emitida.numero_visible,
    emitidaEn: emitida.emitida_en,
  }
}

export async function anularResolucion(
  resolucionId: number,
  motivo: string,
): Promise<void> {
  validarId(
    resolucionId,
    'La resolución',
  )

  const motivoLimpio = motivo.trim()

  if (!motivoLimpio) {
    throw new Error(
      'Debe indicar el motivo de anulación.',
    )
  }

  const estado =
    await obtenerEstadoResolucion(
      resolucionId,
    )

  if (!estado) {
    throw new Error(
      'La resolución no existe.',
    )
  }

  if (estado.estado === 'ANULADA') {
    throw new Error(
      'La resolución ya se encuentra anulada.',
    )
  }

  const db = await obtenerBaseDatos()

  await db.execute(
    `
      UPDATE resoluciones_documentales
      SET
        estado = 'ANULADA',
        motivo_anulacion = $1,
        anulada_en =
          CURRENT_TIMESTAMP,
        actualizada_en =
          CURRENT_TIMESTAMP
      WHERE
        id = $2
        AND estado IN (
          'BORRADOR',
          'EMITIDA'
        )
    `,
    [
      motivoLimpio,
      resolucionId,
    ],
  )
}

export async function vincularResolucionConAnotacion(
  resolucionId: number,
  anotacionId: number,
): Promise<void> {
  validarId(
    resolucionId,
    'La resolución',
  )

  validarId(
    anotacionId,
    'La anotación',
  )

  const db = await obtenerBaseDatos()

  try {
    const filas =
      await db.select<
        Array<{
          estado: EstadoResolucion
          anotacion_id: number | null
        }>
      >(
        `
          SELECT
            estado,
            anotacion_id
          FROM resoluciones_documentales
          WHERE id = $1
          LIMIT 1
        `,
        [resolucionId],
      )

    const resolucion = filas[0]

    if (!resolucion) {
      throw new Error(
        'La resolución no existe.',
      )
    }

    if (
      resolucion.estado !== 'EMITIDA'
    ) {
      throw new Error(
        'Solo se pueden vincular resoluciones emitidas.',
      )
    }

    if (
      resolucion.anotacion_id !== null
    ) {
      throw new Error(
        'La resolución ya está vinculada a una anotación.',
      )
    }

    await db.execute(
      `
        UPDATE resoluciones_documentales
        SET
          anotacion_id = $1,
          actualizada_en =
            CURRENT_TIMESTAMP
        WHERE
          id = $2
          AND estado = 'EMITIDA'
          AND anotacion_id IS NULL
      `,
      [
        anotacionId,
        resolucionId,
      ],
    )

  } catch (excepcion) {
    throw excepcion
  }
}

export async function listarResolucionesEmitidasPendientesPorHojaVida(
  hojaVidaId: number,
): Promise<ResolucionDocumento[]> {
  validarId(
    hojaVidaId,
    'La Hoja de Vida',
  )

  const db = await obtenerBaseDatos()

  return db.select<ResolucionDocumento[]>(
    `
      SELECT *
      FROM vw_resoluciones_documentales
      WHERE
        hoja_vida_id = $1
        AND estado = 'EMITIDA'
        AND anotacion_id IS NULL
      ORDER BY
        tipo_efecto_codigo ASC,
        correlativo DESC,
        resolucion_id DESC
    `,
    [hojaVidaId],
  )
}
