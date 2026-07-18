export interface DocumentoCalificacionResumen {
  hoja_vida_id: number
  persona_id: number
  periodo_id: number
  categoria_id: number
  fecha_inicio: string
  fecha_termino: string
  run: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null
  grado_calidad_abreviatura: string
  grado_calidad_nombre: string
  categoria_codigo: string
  categoria_nombre: string
  periodo_nombre: string
  nombre_completo: string
}

export interface DocumentoCalificacionAnotacion {
  anotacion_id: number
  fecha_anotacion: string
  titulo_final: string
  cuerpo_final: string
  concepto_nombre: string | null
  puntaje_visual: string | null
  valor_centecimas: number | null
  numero_resolucion: string | null
  fecha_resolucion: string | null
}

export interface DocumentoCalificacion<TDatos> {
  resumen: DocumentoCalificacionResumen
  datos: TDatos
}

export interface Hc1Datos {
  cargos: string[]
  tiempoGradoAnios: string
  tiempoGradoMeses: string
  tiempoInstitucionAnios: string
  tiempoInstitucionMeses: string
  tiempoRetiroAnios: string
  tiempoRetiroMeses: string
  cursoDenominacion: string
  cursoDesde: string
  cursoHasta: string
  cursoAprobado: '' | 'SI' | 'NO'
  cursoNota: string
  cursoPuesto: string
  idioma: string
  idiomaNivel: string
  idiomaFecha: string
  idiomaNoRegistraCaducadaDesde: string
  examenes: {
    ejeDoctrinario: '' | 'APROBADO' | 'REPROBADO'
    ejeComplementario: '' | 'APROBADO' | 'REPROBADO'
    ejeTacticoTecnico: '' | 'APROBADO' | 'REPROBADO'
  }
  estadoCivil: string
  numeroHijos: string
}

export interface HamDatos {
  fechaExamenSaludDia: string
  fechaExamenSaludMes: string
  fechaExamenSaludAnio: string
  estadoSalud: '' | 'APTO_MEDICO' | 'APTO_LIMITADA' | 'NO_APTO'
  capacidadLimitada: '' | 'TEMPORAL' | 'PERMANENTE'
  estatura: string
  peso: string
  imc: string
  clasificacionImc: string
  licenciasCantidad: string
  licenciasDias: string
  licencias: Array<{
    desde: string
    hasta: string
  }>
  resolucionSanidadEjercito: '' | 'SI' | 'NO'
  resolucionMedicinaPreventiva: '' | 'SI' | 'NO'
  resolucionSanidadSecundaria: '' | 'SI' | 'NO'
  aptoPortarArmas: '' | 'SI' | 'NO'
  observacionesMedicas: string
  primeraEvaluacionPeso: string
  primeraEvaluacionTalla: string
  primeraEvaluacionImc: string
  primerDni: string
  segundaEvaluacionPeso: string
  segundaEvaluacionTalla: string
  segundaEvaluacionImc: string
  segundoDni: string
  bioPeso: string
  bioTalla: string
  bioImc: string
  bioClasificacionFinal: string
  firmaOficialSanidad: string

  fechaExamenOdontologicoDia: string
  fechaExamenOdontologicoMes: string
  fechaExamenOdontologicoAnio: string
  estadoOdontologico: '' | 'SANO' | 'RIESGO' | 'ALTO_RIESGO'
  observacionesOdontologicas: string
  firmaOficialSanidadDental: string
  firmaCalificadorDirecto: string
  fechaTomaConocimientoDia: string
  fechaTomaConocimientoMes: string
  fechaTomaConocimientoAnio: string
  firmaCalificado: string
}

export interface HapsemDatos {
  especialidades: string[]
  certificacionFisica:
    | ''
    | 'APTO_MUY_BUENO'
    | 'APTO'
    | 'CONDICIONAL'
    | 'NO_APTO'
    | 'NO_RENDIDA'
    | 'APTO_CON_LIMITACIONES'
    | 'APROBADO'
    | 'REPROBADO'
  certificacionCombate:
    | ''
    | 'OPTIMO_COMBATE'
    | 'APTO_COMBATE'
    | 'NO_APTO_COMBATE'
    | 'NO_CERTIFICADO'
    | 'APTO_CON_LIMITACIONES'
  limitacionesCombate: string
  firmaCalificadorDirecto: string
  fechaTomaConocimientoDia: string
  fechaTomaConocimientoMes: string
  fechaTomaConocimientoAnio: string
  firmaCalificado: string
}

export type DocumentoCalificacionTipo =
  | 'HC1'
  | 'HAM'
  | 'HAPSEM'
