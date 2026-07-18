import type { TipoEfectoAnotacion } from './anotaciones'

export type EstadoResolucionAnotacion = 'DISPONIBLE' | 'UTILIZADA' | 'ANULADA'

export interface ResolucionAnotacion {
  id: number
  hoja_vida_id: number
  numero: string
  fecha: string
  tipo_efecto_codigo: Exclude<TipoEfectoAnotacion, 'NEUTRA'>
  concepto_id: number
  concepto_numero: number
  concepto_nombre: string
  puntaje_id: number
  valor_centecimas: number
  puntaje_visual: string
  puntaje_literal: string
  asunto: string | null
  observacion: string | null
  estado: EstadoResolucionAnotacion
  creada_en: string
  actualizada_en: string
}

export interface CrearResolucionAnotacionRequest {
  hojaVidaId: number
  numero: string
  fecha: string
  tipoEfectoCodigo: Exclude<TipoEfectoAnotacion, 'NEUTRA'>
  conceptoId: number
  puntajeId: number
  asunto?: string
  observacion?: string
}
