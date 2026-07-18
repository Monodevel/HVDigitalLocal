export interface FactorCalificacion {
  id: number
  codigo: string
  concepto_id: number
  nombre: string
  descripcion: string
  orden: number
}

export interface ConceptoConFactores {
  area_id: number
  area_codigo: string
  area_nombre: string

  concepto_id: number
  concepto_codigo: string
  concepto_numero: number
  concepto_nombre: string
  concepto_descripcion: string
  concepto_orden: number

  factores: FactorCalificacion[]
}

export interface ConceptoFactorFila {
  area_id: number
  area_codigo: string
  area_nombre: string

  concepto_id: number
  concepto_codigo: string
  concepto_numero: number
  concepto_nombre: string
  concepto_descripcion: string
  concepto_orden: number

  factor_id: number
  factor_codigo: string
  factor_nombre: string
  factor_descripcion: string
  factor_orden: number
}