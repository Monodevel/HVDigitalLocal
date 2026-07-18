export type ColorAnotacion = 'NEGRO' | 'ROJO'
export type TipoEfectoAnotacion = 'NEUTRA' | 'MERITO' | 'DEMERITO'

export interface CategoriaAnotacion {
  id: number
  codigo: string
  nombre: string
  orden: number
}

export interface PlantillaAnotacion {
  id: number
  codigo: string
  nombre: string
  titulo_fuente: string | null
  cuerpo_fuente: string
  color_semantico: ColorAnotacion
  color_hex: string
  pagina_fuente: number
  orden: number

  requiere_firma_calificador: number
  requiere_firma_calificado: number
  firma_oficial_personal: number
  abre_hoja_vida: number
  cierra_hoja_vida: number
  afecta_calificacion: number
  requiere_concepto: number
  requiere_puntaje: number
  tipo_efecto_codigo: 'NEUTRA' | 'MERITO' | 'DEMERITO' | null
  requiere_resolucion: number
  permite_negacion_firma: number

  observacion_uso: string | null

  categoria_id: number
  categoria_codigo: string
  categoria_nombre: string
  categoria_orden: number

  catalogo_codigo: string
  periodo_fuente: string
  fecha_actualizacion_fuente: string
  cuerpo_renderizable: string
  version_plantilla: number
  permite_edicion_libre: number
  texto_normalizado: string | null
}

export type TipoDatoVariable =
  | 'TEXTO'
  | 'TEXTO_LARGO'
  | 'ENTERO'
  | 'DECIMAL'
  | 'FECHA'
  | 'SELECCION'
  | 'DOCUMENTO'
  | 'CONCEPTO'
  | 'PUNTAJE'
  | 'PERSONA'

export interface VariablePlantillaAnotacion {
  id: number
  plantilla_id: number
  plantilla_codigo: string
  plantilla_nombre: string
  codigo: string
  etiqueta: string
  tipo_dato: TipoDatoVariable
  requerido: number
  orden: number
  opciones_json: string | null
  ayuda: string | null
}

export interface ValoresPlantilla {
  [codigo: string]: string | number | null
}

export interface CampoFormularioAnotacion {
  codigo: string
  etiqueta: string
  tipo_dato: TipoDatoVariable
  requerido: number
  orden: number
  opciones: string[]
  ayuda: string | null
}

export interface BorradorAnotacion {
  id: number
  plantilla_id: number
  hoja_vida_id: number | null
  fecha_anotacion: string
  titulo_final: string | null
  cuerpo_final: string | null
  color_semantico: ColorAnotacion
  color_hex: string
  valores_json: string
  estado: 'borrador' | 'validado' | 'estampado' | 'anulado'
  creado_en: string
  actualizado_en: string
}


export interface PuntajeAnotacion {
  id: number
  codigo: string
  tipo_efecto_id: number
  tipo_efecto_codigo: TipoEfectoAnotacion
  valor_centecimas: number
  valor_decimal: number
  texto_visual: string
  texto_literal: string
  orden: number
}

export interface PlantillaAnotacionOperativa extends PlantillaAnotacion {
  tipo_efecto_id: number
  tipo_efecto_codigo: TipoEfectoAnotacion
  tipo_efecto_nombre: string
  tipo_efecto_signo: number
  efecto_afecta_calificacion: number
  permite_seleccionar_concepto: number
  permite_seleccionar_puntaje: number
  concepto_obligatorio: number
  puntaje_obligatorio: number
}

export interface ConceptoOpcion {
  id: number
  numero: number
  codigo: string
  nombre: string
  etiqueta: string
}


export type ModoRedaccionAnotacion =
  | 'PLANTILLA'
  | 'PLANTILLA_EDITABLE'
  | 'LIBRE'

export interface CrearBorradorAnotacionRequest {
  plantilla: PlantillaAnotacion
  hojaVidaId: number
  fechaAnotacion: string
  valores: ValoresPlantilla
  tituloFinal: string
  cuerpoFinal: string
  resolucionId?: number | null
  modoRedaccion?: ModoRedaccionAnotacion
}
