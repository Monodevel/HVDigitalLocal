export interface Hc2Resumen {
  hoja_vida_id: number
  persona_id: number
  periodo_id: number
  categoria_id: number
  fecha_inicio: string
  fecha_termino: string
  run: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null
  grado_calidad_abreviatura: string
  grado_calidad_nombre: string
  categoria_codigo: string
  categoria_nombre: string
  periodo_nombre: string
  nombre_completo: string
}

export interface Hc2AnotacionConcepto {
  anotacion_id: number
  fecha_anotacion: string
  titulo_final: string
  cuerpo_final: string
  numero_resolucion: string | null
  fecha_resolucion: string | null
  puntaje: number
  puntaje_visual: string | null
}

export interface Hc2Concepto {
  numero: number
  nombre: string
  descripcion: string
  area: 'CONDUCTA' | 'DESEMPEÑO PROFESIONAL'
  orden: number

  anotaciones: Hc2AnotacionConcepto[]

  puntajeHojaVida: number
  puntajeHojaVidaVisual: string

  notaParcial: number
  notaParcialVisual: string

  notaPrimeraEvint: number | null
  notaPrimeraEvintVisual: string

  notaSegundaEvint: number | null
  notaSegundaEvintVisual: string

  notaFinal: number | null
  notaFinalVisual: string
}

export interface Hc2Campos {
  opinion_calificador_directo: string | null
  firma_calificador_directo: string | null

  opinion_calificador_superior: string | null
  decision_calificador_superior: 'APRUEBA' | 'MODIFICA' | null
  firma_calificador_superior: string | null

  fecha_toma_conocimiento: string | null
  firma_calificado: string | null

  lista_clasificacion_junta: string | null
  nota_tm_anual_junta: number | null
  firma_presidente_junta: string | null

  fecha_toma_conocimiento_final: string | null
  firma_calificado_final: string | null
}

export interface Hc2Documento {
  resumen: Hc2Resumen
  conceptos: Hc2Concepto[]
  totalPuntajeHojaVida: number
  totalPuntajeHojaVidaVisual: string
  terminoMedio: number | null
  terminoMedioVisual: string
  listaPropuesta: string
  completa: boolean
  campos: Hc2Campos
}

export interface GuardarHc2Input extends Hc2Campos {
  hojaVidaId: number
}
