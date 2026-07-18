export type TipoVinculoPersona = 'GRADO' | 'CALIDAD'

export interface PersonaDisponible {
  id: number
  run: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null
  grado_id: number | null
  calidad_personal_id: number | null
  nombre_completo: string
  etiqueta: string
}

export interface NuevaPersonaCalificadaRequest {
  run: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno?: string
  tipoVinculo: TipoVinculoPersona
  gradoId?: number
  calidadPersonalId?: number
}

export interface DesignarPersonaRequest {
  personaId: number
  unidadNombre: string
  puesto: string
}

export interface ResultadoDesignacion {
  designacionId: number
  expedienteId: number
  hojaVidaId: number
  instrumentoHojaVidaId: number
  instrumentosCreados: number
}

export interface DesignacionPeriodoActivo {
  designacion_id: number
  persona_id: number
  periodo_id: number
  vigencia_periodo_id: number
  categoria_id: number
  grado_id_inicio: number | null
  calidad_personal_id_inicio: number | null
  unidad_nombre: string
  puesto: string
  fecha_inicio: string
  fecha_termino: string
  designacion_estado: string
  run: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string | null
  grado_calidad_abreviatura: string
  grado_calidad_nombre: string
  categoria_codigo: string
  categoria_nombre: string
  periodo_nombre: string
  expediente_id: number
  expediente_estado: string
  hoja_vida_id: number
  nombre_completo: string
}
