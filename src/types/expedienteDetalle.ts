export interface ExpedienteDetalle {
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

  periodo_nombre: string
  periodo_anio: number

  calificador_directo_id: number
  calificador_grado: string
  calificador_nombres: string
  calificador_apellido_paterno: string
  calificador_apellido_materno: string | null
  calificador_unidad: string
  calificador_unidad_sigla: string
  calificador_puesto: string

  hoja_vida_id: number
  hoja_vida_estado: string
  total_anotaciones: number
  total_borradores: number

  persona_nombre_completo: string
  calificador_nombre_completo: string
}

export interface InstrumentoExpedienteDetalle {
  instrumento_id: number
  expediente_id: number
  tipo_instrumento:
    | 'HOJA_VIDA'
    | 'HC1'
    | 'HC2'
    | 'EVINT'
    | 'HAM'
    | 'HAPSEM'
  numero: number
  aplica: number
  estado:
    | 'NO_INICIADO'
    | 'EN_ELABORACION'
    | 'PENDIENTE_FIRMA'
    | 'COMPLETADO'
    | 'CERRADO'
    | 'NO_APLICA'
  version_formato: string
  fecha_apertura: string | null
  fecha_cierre: string | null
  creado_en: string
  actualizado_en: string
  nombre_instrumento: string
  porcentaje_avance: number
}

export interface UltimaAnotacionExpediente {
  expediente_id: number
  anotacion_id: number
  fecha_anotacion: string
  titulo_final: string
  cuerpo_final: string
  color_semantico: 'NEGRO' | 'ROJO'
  color_hex: string
  origen: string
  computa_calificacion: number
  estado: string
  concepto_numero: number | null
  concepto_nombre: string | null
  puntaje_visual: string | null
  puntaje_literal: string | null
}
