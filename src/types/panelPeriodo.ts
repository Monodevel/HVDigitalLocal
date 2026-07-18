export interface PanelPeriodoActivo {
  periodo_id: number
  periodo_nombre: string
  periodo_anio: number
  fecha_inicio: string
  fecha_termino: string
  periodo_estado: string

  calificador_directo_id: number
  calificador_grado: string
  calificador_nombres: string
  calificador_apellido_paterno: string
  calificador_apellido_materno: string | null
  unidad_nombre: string
  unidad_sigla: string
  puesto: string

  total_calificados: number
  expedientes_abiertos: number
  expedientes_cerrados: number
  evint_pendientes: number
  hc1_pendientes: number
  hc2_pendientes: number
  documentos_pendientes_firma: number

  calificador_nombre_completo: string
}

export type EstadoInstrumento =
  | 'NO_INICIADO'
  | 'EN_ELABORACION'
  | 'PENDIENTE_FIRMA'
  | 'COMPLETADO'
  | 'CERRADO'
  | 'NO_APLICA'

export interface ResumenExpedientePeriodo {
  expediente_id: number
  expediente_estado: string
  fecha_apertura: string
  fecha_cierre: string | null

  designacion_id: number
  persona_id: number
  periodo_id: number
  categoria_id: number
  fecha_inicio: string
  fecha_termino: string
  unidad_nombre: string
  puesto: string

  run: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null

  grado_calidad_abreviatura: string
  grado_calidad_nombre: string
  categoria_codigo: string
  categoria_nombre: string

  hoja_vida_id: number
  total_anotaciones: number

  hoja_vida_estado: EstadoInstrumento
  hc1_estado: EstadoInstrumento
  hc2_estado: EstadoInstrumento
  evint_1_estado: EstadoInstrumento
  evint_2_estado: EstadoInstrumento
  ham_estado: EstadoInstrumento
  hapsem_estado: EstadoInstrumento

  nombre_completo: string
}
