export interface PersonaConHojaVidaAbierta {
  persona_id: number
  run: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null
  grado_calidad_abreviatura: string
  grado_calidad_nombre: string
  persona_nombre_completo: string
  etiqueta: string
}

export interface HojaVidaAbierta {
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

  persona_nombre_completo: string

  nombre_completo: string
  etiqueta: string
}

export interface HojaVidaResumen {
  hoja_vida_id: number
  persona_id: number
  periodo_id: number
  categoria_id: number
  fecha_inicio: string
  fecha_termino: string
  hoja_vida_estado: 'abierta' | 'cerrada' | 'anulada'

  run: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null

  grado_calidad_abreviatura: string
  grado_calidad_nombre: string

  categoria_codigo: string
  categoria_nombre: string
  periodo_nombre: string

  total_anotaciones: number
  total_borradores: number
  total_meritos: number
  total_demeritos: number
  total_neutras: number
  puntaje_acumulado_centecimas: number

  nombre_completo: string
  puntaje_acumulado_visual: string
}

export interface BorradorHojaVida {
  borrador_id: number
  hoja_vida_id: number
  plantilla_id: number
  fecha_anotacion: string
  titulo_final: string | null
  cuerpo_final: string | null
  color_semantico: 'NEGRO' | 'ROJO'
  color_hex: string
  valores_json: string
  estado: 'borrador' | 'validado' | 'estampado' | 'anulado'
  concepto_id: number | null
  puntaje_id: number | null
  origen: string
  computa_calificacion: number
  resolucion_documental_id: number | null
  numero_resolucion: string | null
  fecha_resolucion: string | null
  creado_en: string
  actualizado_en: string

  plantilla_codigo: string
  plantilla_nombre: string
  requiere_resolucion: number

  concepto_numero: number | null
  concepto_nombre: string | null

  puntaje_visual: string | null
  puntaje_literal: string | null
  puntaje_centecimas: number | null

  tipo_efecto_codigo: 'NEUTRA' | 'MERITO' | 'DEMERITO' | null
}

export interface AnotacionHojaVida {
  anotacion_id: number
  correlativo: number
  borrador_id: number | null
  hoja_vida_id: number
  plantilla_id: number
  concepto_id: number | null
  puntaje_id: number | null
  fecha_anotacion: string
  titulo_final: string
  cuerpo_final: string
  color_semantico: 'NEGRO' | 'ROJO'
  color_hex: string
  valores_json: string
  origen: string
  computa_calificacion: number
  requiere_resolucion: number
  resolucion_documental_id: number | null
  numero_resolucion: string | null
  fecha_resolucion: string | null
  estado: 'estampada' | 'anulada' | 'reemplazada'
  creada_en: string

  plantilla_codigo: string
  plantilla_nombre: string

  concepto_numero: number | null
  concepto_nombre: string | null

  puntaje_visual: string | null
  puntaje_literal: string | null
  puntaje_centecimas: number | null

  tipo_efecto_codigo: 'NEUTRA' | 'MERITO' | 'DEMERITO' | null
}
