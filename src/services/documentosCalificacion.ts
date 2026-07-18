import {
  obtenerBaseDatos,
} from './database'

import type {
  DocumentoCalificacion,
  DocumentoCalificacionAnotacion,
  DocumentoCalificacionResumen,
  DocumentoCalificacionTipo,
  HamDatos,
  HapsemDatos,
  Hc1Datos,
} from '../types/documentosCalificacion'

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

function tablaPorTipo(
  tipo: DocumentoCalificacionTipo,
): string {
  if (tipo === 'HC1') {
    return 'hc1_documentos'
  }

  if (tipo === 'HAM') {
    return 'ham_documentos'
  }

  return 'hapsem_documentos'
}

function normalizarJson<TDatos>(
  valor: string | null | undefined,
  respaldo: TDatos,
): TDatos {
  if (!valor) {
    return respaldo
  }

  try {
    return {
      ...respaldo,
      ...JSON.parse(valor),
    }
  } catch {
    return respaldo
  }
}

export function crearHc1DatosVacios(): Hc1Datos {
  return {
    cargos: ['', '', ''],
    tiempoGradoAnios: '',
    tiempoGradoMeses: '',
    tiempoInstitucionAnios: '',
    tiempoInstitucionMeses: '',
    tiempoRetiroAnios: '',
    tiempoRetiroMeses: '',
    cursoDenominacion: '',
    cursoDesde: '',
    cursoHasta: '',
    cursoAprobado: '',
    cursoNota: '',
    cursoPuesto: '',
    idioma: '',
    idiomaNivel: '',
    idiomaFecha: '',
    idiomaNoRegistraCaducadaDesde: '',
    examenes: {
      ejeDoctrinario: '',
      ejeComplementario: '',
      ejeTacticoTecnico: '',
    },
    estadoCivil: '',
    numeroHijos: '',
  }
}

export function crearHamDatosVacios(): HamDatos {
  return {
    fechaExamenSaludDia: '',
    fechaExamenSaludMes: '',
    fechaExamenSaludAnio: '',
    estadoSalud: '',
    capacidadLimitada: '',
    estatura: '',
    peso: '',
    imc: '',
    clasificacionImc: '',
    licenciasCantidad: '',
    licenciasDias: '',
    licencias: Array.from({ length: 12 }, () => ({
      desde: '',
      hasta: '',
    })),
    resolucionSanidadEjercito: '',
    resolucionMedicinaPreventiva: '',
    resolucionSanidadSecundaria: '',
    aptoPortarArmas: '',
    observacionesMedicas: '',
    primeraEvaluacionPeso: '',
    primeraEvaluacionTalla: '',
    primeraEvaluacionImc: '',
    primerDni: '',
    segundaEvaluacionPeso: '',
    segundaEvaluacionTalla: '',
    segundaEvaluacionImc: '',
    segundoDni: '',
    bioPeso: '',
    bioTalla: '',
    bioImc: '',
    bioClasificacionFinal: '',
    firmaOficialSanidad: '',
    fechaExamenOdontologicoDia: '',
    fechaExamenOdontologicoMes: '',
    fechaExamenOdontologicoAnio: '',
    estadoOdontologico: '',
    observacionesOdontologicas: '',
    firmaOficialSanidadDental: '',
    firmaCalificadorDirecto: '',
    fechaTomaConocimientoDia: '',
    fechaTomaConocimientoMes: '',
    fechaTomaConocimientoAnio: '',
    firmaCalificado: '',
  }
}

export function crearHapsemDatosVacios(): HapsemDatos {
  return {
    especialidades: ['', '', '', '', '', ''],
    certificacionFisica: '',
    certificacionCombate: '',
    limitacionesCombate: '',
    firmaCalificadorDirecto: '',
    fechaTomaConocimientoDia: '',
    fechaTomaConocimientoMes: '',
    fechaTomaConocimientoAnio: '',
    firmaCalificado: '',
  }
}

async function obtenerResumen(
  hojaVidaId: number,
): Promise<DocumentoCalificacionResumen> {
  const db = await obtenerBaseDatos()

  const filas =
    await db.select<DocumentoCalificacionResumen[]>(
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
    throw new Error(
      'No se encontró la Hoja de Vida seleccionada.',
    )
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

export async function obtenerDocumentoCalificacion<TDatos>(
  tipo: DocumentoCalificacionTipo,
  hojaVidaId: number,
  datosVacios: TDatos,
): Promise<DocumentoCalificacion<TDatos>> {
  const db = await obtenerBaseDatos()
  const tabla = tablaPorTipo(tipo)

  const [resumen, filas] =
    await Promise.all([
      obtenerResumen(hojaVidaId),
      db.select<Array<{ datos_json: string }>>(
        `
          SELECT datos_json
          FROM ${tabla}
          WHERE hoja_vida_id = $1
          LIMIT 1
        `,
        [hojaVidaId],
      ),
    ])

  return {
    resumen,
    datos:
      normalizarJson(
        filas[0]?.datos_json,
        datosVacios,
      ),
  }
}

export async function guardarDocumentoCalificacion<TDatos>(
  tipo: DocumentoCalificacionTipo,
  hojaVidaId: number,
  datos: TDatos,
): Promise<void> {
  const db = await obtenerBaseDatos()
  const tabla = tablaPorTipo(tipo)

  await db.execute(
    `
      INSERT INTO ${tabla} (
        hoja_vida_id,
        datos_json,
        actualizado_en
      )
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT(hoja_vida_id)
      DO UPDATE SET
        datos_json = excluded.datos_json,
        actualizado_en = CURRENT_TIMESTAMP
    `,
    [
      hojaVidaId,
      JSON.stringify(datos),
    ],
  )
}

export async function listarAnotacionesMeritoDemerito(
  hojaVidaId: number,
): Promise<{
  merito: DocumentoCalificacionAnotacion[]
  demerito: DocumentoCalificacionAnotacion[]
}> {
  const db = await obtenerBaseDatos()

  const filas =
    await db.select<DocumentoCalificacionAnotacion[]>(
      `
        SELECT
          a.id AS anotacion_id,
          a.fecha_anotacion,
          a.titulo_final,
          a.cuerpo_final,
          c.nombre AS concepto_nombre,
          pa.texto_visual AS puntaje_visual,
          pa.valor_centecimas,
          COALESCE(
            a.numero_resolucion,
            rd.numero_visible,
            json_extract(a.valores_json, '$.numero_resolucion')
          ) AS numero_resolucion,
          COALESCE(
            a.fecha_resolucion,
            rd.fecha_documento,
            json_extract(a.valores_json, '$.fecha_resolucion')
          ) AS fecha_resolucion
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
          AND pa.valor_centecimas IS NOT NULL
        ORDER BY
          a.fecha_anotacion,
          a.id
      `,
      [hojaVidaId],
    )

  return {
    merito:
      filas.filter(
        fila =>
          (fila.valor_centecimas ?? 0) > 0,
      ),
    demerito:
      filas.filter(
        fila =>
          (fila.valor_centecimas ?? 0) < 0,
      ),
  }
}
