export type EstadoPeriodo =
  | 'ABIERTO'
  | 'CERRADO'

export interface PeriodoCalificacion {
  id: number
  nombre: string
  anio: number | null
  fechaInicio: string | null
  fechaTermino: string | null
  estado: EstadoPeriodo
  cerradoEn: string | null
  observacionCierre: string | null
  modoLectura: boolean
  esPeriodoActivo: boolean
  esPeriodoVisualizado: boolean
}

export interface ContextoPeriodo {
  periodoActivoId: number | null
  periodoVisualizacionId: number | null
  modoLectura: boolean
  periodoActivo: PeriodoCalificacion | null
  periodoVisualizado: PeriodoCalificacion | null
}

export interface CrearPeriodoInput {
  nombre: string
  anio?: number | null
  fechaInicio?: string | null
  fechaTermino?: string | null
  activar?: boolean
}

export interface CerrarPeriodoInput {
  periodoId: number
  observacion?: string | null
}

export interface SeleccionarPeriodoInput {
  periodoId: number
}
