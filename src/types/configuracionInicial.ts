export type EstadoConfiguracionInicial =
  | 'NO_CONFIGURADA'
  | 'EN_PROGRESO'
  | 'CONFIGURADA_SIN_PERSONAL'
  | 'OPERATIVA'

export interface EstadoConfiguracionInicialDto {
  id: number
  estado: EstadoConfiguracionInicial
  paso_actual: number
  calificador_directo_id: number | null
  periodo_activo_id: number | null
  completada_en: string | null
  actualizado_en: string

  grado_id: number | null
  grado_abreviatura: string | null
  grado_nombre: string | null

  run: string | null
  nombres: string | null
  apellido_paterno: string | null
  apellido_materno: string | null
  unidad_nombre: string | null
  unidad_sigla: string | null
  puesto: string | null

  periodo_nombre: string | null
  periodo_anio: number | null
  periodo_fecha_inicio: string | null
  periodo_fecha_termino: string | null
  periodo_estado: string | null
}

export interface DatosCalificadorDirecto {
  gradoId: number
  run?: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno?: string
  unidadNombre: string
  unidadSigla: string
  puesto: string
}

export interface VigenciaPeriodo {
  id: number
  periodo_id: number
  codigo_regimen: string
  nombre_regimen: string
  fecha_inicio: string
  fecha_termino: string
  orden: number
}

export interface ResultadoCreacionPeriodo {
  periodoId: number
  nombre: string
  anioInicio: number
  anioTermino: number
  vigencias: VigenciaPeriodo[]
}
