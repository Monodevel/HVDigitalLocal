export type TipoEfectoResolucion =
  | 'MERITO'
  | 'DEMERITO'

export type EstadoResolucion =
  | 'BORRADOR'
  | 'EMITIDA'
  | 'ANULADA'

export type SeccionResolucion =
  | 'VISTOS'
  | 'CONSIDERANDO'
  | 'RESUELVO'
  | 'DISTRIBUCION'

export type OrigenPuntoResolucion =
  | 'REGLAMENTARIO'
  | 'USUARIO'
  | 'GENERADO'

export interface PuntoResolucion {
  id?: number
  resolucion_id?: number
  seccion: SeccionResolucion
  orden: number
  texto: string
  origen: OrigenPuntoResolucion
  obligatorio: 0 | 1
  editable: 0 | 1
}

export interface PuntoReglamentarioResolucion {
  id: number
  tipo_aplicacion:
    | 'TODAS'
    | TipoEfectoResolucion
  seccion: SeccionResolucion
  orden: number
  texto: string
  obligatorio: 0 | 1
  editable: 0 | 1
  activo: 0 | 1
}

export interface ResolucionDocumento {
  resolucion_id: number
  hoja_vida_id: number
  persona_id: number

  tipo_efecto_codigo:
    TipoEfectoResolucion

  prefijo: string
  correlativo: number | null
  numero_visible: string | null
  fecha_documento: string

  concepto_id: number
  puntaje_id: number

  asunto: string | null
  antecedente_principal: string | null
  resuelvo_principal: string
  resuelvo_anotacion: string
  cierre: string

  firmante_nombre: string | null
  firmante_grado: string | null
  firmante_cargo: string | null

  estado: EstadoResolucion
  anotacion_id: number | null

  emitida_en: string | null
  anulada_en: string | null
  motivo_anulacion: string | null

  creada_en: string
  actualizada_en: string

  run: string
  persona_nombre_completo: string
  grado_calidad_abreviatura:
    string | null

  concepto_numero_actual: number
  concepto_nombre_actual: string
  puntaje_visual_actual: string
  puntaje_literal_actual: string
}

export interface CrearBorradorResolucionInput {
  hojaVidaId: number
  personaId: number
  tipoEfectoCodigo:
    TipoEfectoResolucion
  fechaDocumento: string
  conceptoId: number
  puntajeId: number
  asunto?: string
  antecedentePrincipal?: string
  resuelvoPrincipal: string
  resuelvoAnotacion: string
  firmanteNombre?: string
  firmanteGrado?: string
  firmanteCargo?: string
  puntos: PuntoResolucion[]
}

export interface ActualizarBorradorResolucionInput
  extends CrearBorradorResolucionInput {
  resolucionId: number
}

export interface ResultadoEmisionResolucion {
  resolucionId: number
  correlativo: number
  numeroVisible: string
  emitidaEn: string
}
