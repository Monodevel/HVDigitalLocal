export interface AreaEvaluacion {
  id: number
  codigo: string
  nombre: string
  descripcion: string | null
  orden: number
}

export interface ConceptoCalificacion {
  id: number
  codigo: string
  numero: number
  nombre: string
  area_evaluacion_id: number
  area_codigo: string
  area_nombre: string
  orden: number
}

export interface CategoriaPersonal {
  id: number
  codigo: string
  nombre: string
  cantidad_conceptos: number
  orden: number
  es_militar: number
}

export interface ConceptoCategoria {
  categoria_id: number
  categoria_codigo: string
  categoria_nombre: string
  concepto_id: number
  concepto_codigo: string
  concepto_numero: number
  concepto_nombre: string
  area_codigo: string
  area_nombre: string
  orden: number
}

export interface CategoriaConConceptos
  extends CategoriaPersonal {
  conceptos: ConceptoCategoria[]
}