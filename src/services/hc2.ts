import {
  obtenerBaseDatos,
} from './database'

import type {
  GuardarHc2Input,
  Hc2AnotacionConcepto,
  Hc2Campos,
  Hc2Concepto,
  Hc2Documento,
  Hc2Resumen,
} from '../types/hc2'

const NOTA_BASE = 6
const NOTA_MINIMA = 1
const NOTA_MAXIMA = 7

const PONDERACION_NOTA_PARCIAL = 0.60
const PONDERACION_PRIMERA_EVINT = 0.20
const PONDERACION_SEGUNDA_EVINT = 0.20

interface ConceptoCatalogo {
  concepto_id: number
  numero: number
  codigo: string
  nombre: string
  descripcion: string
  orden: number
  area_codigo: string
  area_nombre: string
}

interface FilaAnotacionHc2 {
  anotacion_id: number
  fecha_anotacion: string
  titulo_final: string
  cuerpo_final: string
  numero_resolucion: string | null
  fecha_resolucion: string | null
  concepto_numero: number | null
  valor_centecimas: number | null
  puntaje_visual: string | null
}

interface FilaEvintConcepto {
  numero_evint: 1 | 2
  concepto_numero: number
  nota: number | null
}

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

function limitarNota(
  nota: number,
): number {
  return Number(
    Math.min(
      NOTA_MAXIMA,
      Math.max(NOTA_MINIMA, nota),
    ).toFixed(2),
  )
}

function formatearNumero(
  valor: number | null,
): string {
  if (valor === null || Number.isNaN(valor)) {
    return ''
  }

  return valor
    .toFixed(2)
    .replace('.', ',')
}

function formatearPuntaje(
  valor: number,
): string {
  const signo = valor > 0 ? '+' : ''

  return `${signo}${formatearNumero(valor)}`
}

function calcularNotaParcial(
  puntajeHojaVida: number,
): number {
  return limitarNota(
    NOTA_BASE + puntajeHojaVida,
  )
}

function calcularNotaFinal(
  notaParcial: number,
  notaPrimeraEvint: number | null,
  notaSegundaEvint: number | null,
): number | null {
  if (
    notaPrimeraEvint === null ||
    notaSegundaEvint === null
  ) {
    return null
  }

  return limitarNota(
    notaParcial * PONDERACION_NOTA_PARCIAL +
    notaPrimeraEvint * PONDERACION_PRIMERA_EVINT +
    notaSegundaEvint * PONDERACION_SEGUNDA_EVINT,
  )
}

function calcularTerminoMedio(
  conceptos: Hc2Concepto[],
): number | null {
  if (conceptos.length === 0) {
    return null
  }

  const notas =
    conceptos
      .map(concepto => concepto.notaFinal)
      .filter(
        (nota): nota is number =>
          nota !== null,
      )

  if (notas.length !== conceptos.length) {
    return null
  }

  return Number(
    (
      notas.reduce(
        (total, nota) => total + nota,
        0,
      ) / notas.length
    ).toFixed(2),
  )
}

function determinarListaPropuesta(
  terminoMedio: number | null,
): string {
  if (terminoMedio === null) {
    return 'Pendiente'
  }

  if (terminoMedio >= 6.00) {
    return 'Lista N.º 1'
  }

  if (terminoMedio >= 5.00) {
    return 'Lista N.º 2'
  }

  if (terminoMedio >= 4.00) {
    return 'Lista N.º 3'
  }

  return 'Lista N.º 4'
}

function numerosConceptosPorCategoria(
  categoriaCodigo: string,
): number[] {
  const codigo =
    categoriaCodigo
      .trim()
      .toUpperCase()

  if (codigo === 'OFICIAL_SUPERIOR') {
    return [1, 2, 3, 5, 6, 8, 9]
  }

  if (
    codigo === 'SLTP' ||
    codigo === 'SOLDADO_TROPA_PROFESIONAL'
  ) {
    return [1, 3, 4, 9]
  }

  if (
    codigo === 'PERSONAL_CIVIL' ||
    codigo === 'PERSONAL_JORNAL'
  ) {
    return [1, 2, 3, 4, 6, 9]
  }

  return [1, 2, 3, 4, 5, 6, 7, 8, 9]
}

function areaConcepto(
  numero: number,
): 'CONDUCTA' | 'DESEMPEÑO PROFESIONAL' {
  return numero <= 4
    ? 'CONDUCTA'
    : 'DESEMPEÑO PROFESIONAL'
}

async function obtenerResumen(
  hojaVidaId: number,
): Promise<Hc2Resumen | null> {
  const db = await obtenerBaseDatos()

  const filas =
    await db.select<Hc2Resumen[]>(
      `
        SELECT *
        FROM vw_hoja_vida_resumen
        WHERE hoja_vida_id = $1
        LIMIT 1
      `,
      [hojaVidaId],
    )

  const fila = filas[0]

  if (!fila) {
    return null
  }

  return {
    ...fila,
    nombre_completo:
      construirNombreCompleto(
        fila.nombres,
        fila.apellido_paterno,
        fila.apellido_materno,
      ),
  }
}

async function listarConceptos(
  resumen: Hc2Resumen,
): Promise<ConceptoCatalogo[]> {
  const db = await obtenerBaseDatos()
  const numeros =
    numerosConceptosPorCategoria(
      resumen.categoria_codigo,
    )

  const filas =
    await db.select<ConceptoCatalogo[]>(
      `
        SELECT
          c.id AS concepto_id,
          c.numero,
          c.codigo,
          c.nombre,
          c.descripcion_normativa AS descripcion,
          c.orden,
          a.codigo AS area_codigo,
          a.nombre AS area_nombre
        FROM conceptos_calificacion c
        INNER JOIN areas_evaluacion a
          ON a.id = c.area_evaluacion_id
        WHERE
          c.activo = 1
          AND c.numero IN (${numeros.map(() => '?').join(',')})
        ORDER BY c.numero
      `,
      numeros,
    )

  return filas
}

/**
 * Esta consulta es deliberadamente amplia.
 *
 * Antes la HC2 filtraba por a.computa_calificacion = 1
 * y por joins directos a a.concepto_id / a.puntaje_id.
 * Eso dejaba fuera anotaciones estampadas que venían desde
 * resolución documental cuando esos campos quedaron nulos o
 * cuando computa_calificacion no fue actualizado correctamente.
 *
 * Ahora toma SOLO las anotaciones estampadas de la Hoja de Vida
 * que tengan puntaje resoluble.
 *
 * No se usa el flag a.computa_calificacion como filtro principal,
 * porque algunas anotaciones válidas estampadas desde resolución
 * pueden quedar con ese flag mal sincronizado. La regla real para HC2
 * es: si la anotación tiene puntaje y concepto, entra al cálculo.
 *
 * Usa como respaldo:
 *
 * 1. datos directos de anotaciones;
 * 2. datos de resoluciones_documentales asociadas;
 * 3. datos guardados en valores_json del borrador/anotación.
 */
async function listarAnotaciones(
  hojaVidaId: number,
): Promise<Map<number, Hc2AnotacionConcepto[]>> {
  const db = await obtenerBaseDatos()

  const filas =
    await db.select<FilaAnotacionHc2[]>(
      `
        SELECT
          a.id AS anotacion_id,
          a.fecha_anotacion,
          a.titulo_final,
          a.cuerpo_final,

          COALESCE(
            a.numero_resolucion,
            rd.numero_visible,
            json_extract(a.valores_json, '$.numero_resolucion')
          ) AS numero_resolucion,

          COALESCE(
            a.fecha_resolucion,
            rd.fecha_documento,
            json_extract(a.valores_json, '$.fecha_resolucion')
          ) AS fecha_resolucion,

          c.numero AS concepto_numero,

          pa.valor_centecimas,

          COALESCE(
            pa.texto_visual,
            json_extract(a.valores_json, '$.puntaje_visual'),
            json_extract(a.valores_json, '$.puntaje')
          ) AS puntaje_visual

        FROM anotaciones a

        LEFT JOIN resoluciones_documentales rd
          ON rd.id = a.resolucion_documental_id

        LEFT JOIN conceptos_calificacion c
          ON c.id = COALESCE(
            a.concepto_id,
            rd.concepto_id,
            CAST(json_extract(a.valores_json, '$.concepto_id') AS INTEGER)
          )

        LEFT JOIN puntajes_anotacion pa
          ON pa.id = COALESCE(
            a.puntaje_id,
            rd.puntaje_id,
            CAST(json_extract(a.valores_json, '$.puntaje_id') AS INTEGER)
          )

        WHERE
          a.hoja_vida_id = $1
          AND a.estado = 'estampada'

          -- La HC2 considera solamente anotaciones con puntaje.
          -- El puntaje puede venir directo de la anotación,
          -- de la resolución documental o del JSON guardado.
          AND pa.valor_centecimas IS NOT NULL

          -- Además debe poder asociarse a un concepto,
          -- porque la HC2 distribuye los puntajes por concepto.
          AND c.numero IS NOT NULL

        ORDER BY
          c.numero,
          a.fecha_anotacion,
          a.id
      `,
      [hojaVidaId],
    )

  const grupos =
    new Map<number, Hc2AnotacionConcepto[]>()

  for (const fila of filas) {
    if (
      fila.concepto_numero === null ||
      fila.valor_centecimas === null
    ) {
      continue
    }

    const puntaje =
      Number(
        (
          fila.valor_centecimas /
          100
        ).toFixed(2),
      )

    const lista =
      grupos.get(fila.concepto_numero) ?? []

    lista.push({
      anotacion_id: fila.anotacion_id,
      fecha_anotacion: fila.fecha_anotacion,
      titulo_final: fila.titulo_final,
      cuerpo_final: fila.cuerpo_final,
      numero_resolucion: fila.numero_resolucion,
      fecha_resolucion: fila.fecha_resolucion,
      puntaje,
      puntaje_visual:
        fila.puntaje_visual ??
        formatearPuntaje(puntaje),
    })

    grupos.set(
      fila.concepto_numero,
      lista,
    )
  }

  return grupos
}

async function listarNotasEvint(
  hojaVidaId: number,
): Promise<Map<string, number>> {
  const db = await obtenerBaseDatos()

  const filas =
    await db.select<FilaEvintConcepto[]>(
      `
        SELECT
          ee.numero AS numero_evint,
          f.concepto_numero,
          ROUND(AVG(es.valor), 2) AS nota
        FROM evaluaciones_evint ee
        INNER JOIN expedientes_calificacion ex
          ON ex.id = ee.expediente_id
        INNER JOIN hojas_vida hv
          ON hv.persona_id = ex.persona_id
          AND hv.periodo_id = ex.periodo_id
          AND hv.categoria_id = ex.categoria_id
        INNER JOIN respuestas_evint r
          ON r.evaluacion_evint_id = ee.id
        INNER JOIN escalas_evint es
          ON es.id = r.escala_id
        INNER JOIN vw_evint_factores f
          ON f.factor_id = r.factor_id
        WHERE
          hv.id = $1
          AND ee.estado IN ('COMPLETADA', 'CERRADA')
          AND es.valor IS NOT NULL
        GROUP BY
          ee.numero,
          f.concepto_numero
      `,
      [hojaVidaId],
    )

  const notas = new Map<string, number>()

  for (const fila of filas) {
    if (fila.nota !== null) {
      notas.set(
        `${fila.concepto_numero}:${fila.numero_evint}`,
        Number(fila.nota),
      )
    }
  }

  return notas
}

async function obtenerCampos(
  hojaVidaId: number,
): Promise<Hc2Campos> {
  const db = await obtenerBaseDatos()

  const filas =
    await db.select<Hc2Campos[]>(
      `
        SELECT
          opinion_calificador_directo,
          firma_calificador_directo,
          opinion_calificador_superior,
          decision_calificador_superior,
          firma_calificador_superior,
          fecha_toma_conocimiento,
          firma_calificado,
          lista_clasificacion_junta,
          nota_tm_anual_junta,
          firma_presidente_junta,
          fecha_toma_conocimiento_final,
          firma_calificado_final
        FROM hc2_calificaciones
        WHERE hoja_vida_id = $1
        LIMIT 1
      `,
      [hojaVidaId],
    )

  return filas[0] ?? {
    opinion_calificador_directo: null,
    firma_calificador_directo: null,
    opinion_calificador_superior: null,
    decision_calificador_superior: null,
    firma_calificador_superior: null,
    fecha_toma_conocimiento: null,
    firma_calificado: null,
    lista_clasificacion_junta: null,
    nota_tm_anual_junta: null,
    firma_presidente_junta: null,
    fecha_toma_conocimiento_final: null,
    firma_calificado_final: null,
  }
}

export async function obtenerHc2(
  hojaVidaId: number,
): Promise<Hc2Documento> {
  if (
    !Number.isInteger(hojaVidaId) ||
    hojaVidaId <= 0
  ) {
    throw new Error(
      'El identificador de la Hoja de Vida no es válido.',
    )
  }

  const resumen =
    await obtenerResumen(hojaVidaId)

  if (!resumen) {
    throw new Error(
      'No se encontró la Hoja de Vida seleccionada.',
    )
  }

  const [
    conceptosCatalogo,
    anotacionesPorConcepto,
    notasEvint,
    campos,
  ] = await Promise.all([
    listarConceptos(resumen),
    listarAnotaciones(hojaVidaId),
    listarNotasEvint(hojaVidaId),
    obtenerCampos(hojaVidaId),
  ])

  const conceptos =
    conceptosCatalogo.map<Hc2Concepto>(
      concepto => {
        const anotaciones =
          anotacionesPorConcepto.get(
            concepto.numero,
          ) ?? []

        const puntajeHojaVida =
          Number(
            anotaciones
              .reduce(
                (total, anotacion) =>
                  total + anotacion.puntaje,
                0,
              )
              .toFixed(2),
          )

        const notaParcial =
          calcularNotaParcial(
            puntajeHojaVida,
          )

        const notaPrimeraEvint =
          notasEvint.get(
            `${concepto.numero}:1`,
          ) ?? null

        const notaSegundaEvint =
          notasEvint.get(
            `${concepto.numero}:2`,
          ) ?? null

        const notaFinal =
          calcularNotaFinal(
            notaParcial,
            notaPrimeraEvint,
            notaSegundaEvint,
          )

        return {
          numero: concepto.numero,
          nombre: concepto.nombre,
          descripcion: concepto.descripcion,
          area: areaConcepto(concepto.numero),
          orden: concepto.orden,
          anotaciones,
          puntajeHojaVida,
          puntajeHojaVidaVisual:
            formatearPuntaje(puntajeHojaVida),
          notaParcial,
          notaParcialVisual:
            formatearNumero(notaParcial),
          notaPrimeraEvint,
          notaPrimeraEvintVisual:
            formatearNumero(notaPrimeraEvint),
          notaSegundaEvint,
          notaSegundaEvintVisual:
            formatearNumero(notaSegundaEvint),
          notaFinal,
          notaFinalVisual:
            formatearNumero(notaFinal),
        }
      },
    )

  const terminoMedio =
    calcularTerminoMedio(conceptos)

  const totalPuntajeHojaVida =
    Number(
      conceptos
        .reduce(
          (total, concepto) =>
            total + concepto.puntajeHojaVida,
          0,
        )
        .toFixed(2),
    )

  return {
    resumen,
    conceptos,
    totalPuntajeHojaVida,
    totalPuntajeHojaVidaVisual:
      formatearPuntaje(totalPuntajeHojaVida),
    terminoMedio,
    terminoMedioVisual:
      formatearNumero(terminoMedio),
    listaPropuesta:
      determinarListaPropuesta(
        terminoMedio,
      ),
    completa:
      terminoMedio !== null,
    campos,
  }
}

export async function guardarHc2(
  entrada: GuardarHc2Input,
): Promise<void> {
  const db = await obtenerBaseDatos()

  await db.execute(
    `
      INSERT INTO hc2_calificaciones (
        hoja_vida_id,
        opinion_calificador_directo,
        firma_calificador_directo,
        opinion_calificador_superior,
        decision_calificador_superior,
        firma_calificador_superior,
        fecha_toma_conocimiento,
        firma_calificado,
        lista_clasificacion_junta,
        nota_tm_anual_junta,
        firma_presidente_junta,
        fecha_toma_conocimiento_final,
        firma_calificado_final,
        actualizada_en
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(hoja_vida_id)
      DO UPDATE SET
        opinion_calificador_directo = excluded.opinion_calificador_directo,
        firma_calificador_directo = excluded.firma_calificador_directo,
        opinion_calificador_superior = excluded.opinion_calificador_superior,
        decision_calificador_superior = excluded.decision_calificador_superior,
        firma_calificador_superior = excluded.firma_calificador_superior,
        fecha_toma_conocimiento = excluded.fecha_toma_conocimiento,
        firma_calificado = excluded.firma_calificado,
        lista_clasificacion_junta = excluded.lista_clasificacion_junta,
        nota_tm_anual_junta = excluded.nota_tm_anual_junta,
        firma_presidente_junta = excluded.firma_presidente_junta,
        fecha_toma_conocimiento_final = excluded.fecha_toma_conocimiento_final,
        firma_calificado_final = excluded.firma_calificado_final,
        actualizada_en = CURRENT_TIMESTAMP
    `,
    [
      entrada.hojaVidaId,
      entrada.opinion_calificador_directo?.trim() || null,
      entrada.firma_calificador_directo?.trim() || null,
      entrada.opinion_calificador_superior?.trim() || null,
      entrada.decision_calificador_superior || null,
      entrada.firma_calificador_superior?.trim() || null,
      entrada.fecha_toma_conocimiento || null,
      entrada.firma_calificado?.trim() || null,
      entrada.lista_clasificacion_junta?.trim() || null,
      entrada.nota_tm_anual_junta ?? null,
      entrada.firma_presidente_junta?.trim() || null,
      entrada.fecha_toma_conocimiento_final || null,
      entrada.firma_calificado_final?.trim() || null,
    ],
  )
}
