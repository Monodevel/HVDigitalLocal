export type OrigenAnotacion =
  | 'CALIFICADOR_DIRECTO'
  | 'AUTORIDAD_SUPERIOR'
  | 'OFICIAL_GENERAL'
  | 'OFICIAL_PERSONAL'
  | 'SISTEMA'

export type TipoEfectoEstampado = 'NEUTRA' | 'MERITO' | 'DEMERITO'

export interface SolicitudEstampadoAnotacion {
  borradorId: number
  origen: OrigenAnotacion
}

export interface ResultadoValidacionEstampado {
  valido: boolean
  errores: string[]
  advertencias: string[]
  computaCalificacion: boolean
}

export interface ResultadoEstampadoAnotacion {
  anotacionId: number
  borradorId: number
  computaCalificacion: boolean
}

export interface BorradorParaEstampar {
  id: number
  plantilla_id: number
  hoja_vida_id: number | null
  fecha_anotacion: string
  titulo_final: string | null
  cuerpo_final: string | null
  color_semantico: 'NEGRO' | 'ROJO'
  color_hex: string
  valores_json: string
  estado: 'borrador' | 'validado' | 'estampado' | 'anulado'
  concepto_id: number | null
  puntaje_id: number | null
  resolucion_id: number | null
  modo_redaccion: 'PLANTILLA' | 'PLANTILLA_EDITABLE' | 'LIBRE'
  plantilla_codigo: string
  plantilla_nombre: string
  requiere_resolucion: number
  tipo_efecto_codigo: TipoEfectoEstampado
  permite_seleccionar_concepto: number
  permite_seleccionar_puntaje: number
  concepto_obligatorio: number
  puntaje_obligatorio: number
  hoja_estado: 'abierta' | 'cerrada' | 'anulada' | null
  categoria_id: number | null
  resolucion_numero: string | null
  resolucion_fecha: string | null
  resolucion_estado: string | null
}
