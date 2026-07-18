export type TipoGradoCalidad = 'GRADO' | 'CALIDAD'

export interface Grado {
  id: number
  codigo: string
  abreviatura: string
  nombre: string
  categoria_id: number | null
  categoria_codigo: string | null
  categoria_nombre: string | null
  orden_jerarquico: number
  sujeto_calificacion: number
  es_oficial: number
  es_cuadro_permanente: number
  es_tropa_profesional: number
}

export interface CalidadPersonal {
  id: number
  codigo: string
  abreviatura: string
  nombre: string
  categoria_id: number
  categoria_codigo: string
  categoria_nombre: string
  sujeto_calificacion: number
}

export interface GradoCalidad {
  tipo: TipoGradoCalidad
  id: number
  codigo: string
  abreviatura: string
  nombre: string
  categoria_id: number | null
  categoria_codigo: string | null
  categoria_nombre: string | null
  orden: number
  sujeto_calificacion: number
  activo: number
}