export type EstadoEvint =
  | 'BORRADOR'
  | 'COMPLETADA'
  | 'CERRADA'
  | 'ANULADA'

export type TipoRecursoEvint =
  | 'REPOSICION_JERARQUICO_SUBSIDIO'
  | 'JERARQUICO'
  | null

export type DecisionRecursoEvint =
  | 'ACEPTA'
  | 'RECHAZA'
  | 'ACEPTA_PARCIALMENTE'
  | null

export interface EscalaEvint {
  id: number
  codigo: string
  nombre: string
  valor: number | null
  orden: number
}

export interface EvintEncabezado {
  evaluacion_evint_id: number
  instrumento_id: number
  expediente_id: number
  numero: 1 | 2
  estado: EstadoEvint
  fecha_evaluacion: string
  observacion_general: string | null
  promedio: number | null
  total_factores: number
  total_evaluados: number
  total_no_observados: number
  creada_en: string
  actualizada_en: string
  completada_en: string | null

  realiza_evint: number
  justificacion_siempre: string | null
  justificacion_casi_nunca: string | null
  justificacion_no_observado: string | null
  justificacion_isa: string | null
  recursos: string | null
  fecha_toma_conocimiento: string | null
  firma_calificado: string | null
  firma_calificador: string | null
  tipo_recurso: TipoRecursoEvint
  fecha_presentacion_recurso: string | null
  decision_calificador_directo: DecisionRecursoEvint
  fecha_decision_calificador_directo: string | null
  decision_calificador_superior: DecisionRecursoEvint
  fecha_decision_calificador_superior: string | null

  persona_id: number
  periodo_id: number
  categoria_id: number
  run: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null
  grado_calidad_abreviatura: string
  grado_calidad_nombre: string
  categoria_codigo: string
  categoria_nombre: string
  periodo_nombre: string
  unidad_nombre: string
  puesto: string
  fecha_inicio: string
  fecha_termino: string
  nombre_completo: string
}

export interface RespuestaEvint {
  respuesta_id: number
  evaluacion_evint_id: number
  factor_id: number
  escala_id: number | null
  observacion: string | null
  escala_codigo: string | null
  escala_nombre: string | null
  escala_valor: number | null
  factor_codigo: string
  factor_nombre: string
  factor_descripcion: string
  concepto_id: number
  concepto_codigo: string
  concepto_numero: number
  concepto_nombre: string
  concepto_descripcion: string
  concepto_orden: number
  area_id: number
  area_codigo: string
  area_nombre: string
  area_orden: number
}

export interface ConceptoEvint {
  area_id: number
  area_codigo: string
  area_nombre: string
  concepto_id: number
  concepto_numero: number
  concepto_nombre: string
  concepto_descripcion: string
  concepto_orden: number
  respuestas: RespuestaEvint[]
}

export interface GuardarRespuestaEvintRequest {
  evaluacionEvintId: number
  factorId: number
  escalaId: number | null
  observacion?: string
}

export interface GuardarEvintRequest {
  evaluacionEvintId: number
  fechaEvaluacion: string
  observacionGeneral?: string
  realizaEvint: boolean
  justificacionSiempre?: string
  justificacionCasiNunca?: string
  justificacionNoObservado?: string
  justificacionIsa?: string
  recursos?: string
  fechaTomaConocimiento?: string
  firmaCalificado?: string
  firmaCalificador?: string
  tipoRecurso?: TipoRecursoEvint
  fechaPresentacionRecurso?: string
  decisionCalificadorDirecto?: DecisionRecursoEvint
  fechaDecisionCalificadorDirecto?: string
  decisionCalificadorSuperior?: DecisionRecursoEvint
  fechaDecisionCalificadorSuperior?: string
}

export interface ResultadoCalculoEvint {
  /*
   * Promedio general referencial.
   * Se obtiene promediando las notas de los conceptos.
   */
  promedio: number | null

  totalFactores: number
  totalEvaluados: number
  totalNoObservados: number

  conceptos: ResultadoConceptoEvint[]
}

export interface ResultadoConceptoEvint {
  conceptoId: number
  conceptoNumero: number
  conceptoCodigo: string
  conceptoNombre: string
  conceptoOrden: number

  sumaValores: number
  totalDescriptores: number
  totalEvaluados: number
  totalNoObservados: number

  notaEvint: number | null
}
