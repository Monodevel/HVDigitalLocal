export type SeccionConfiguracion =
  | 'CALIFICADOR'
  | 'UNIDAD'
  | 'PERIODO'
  | 'NUMERACION'
  | 'BASE_DATOS'
  | 'ACERCA_DE'

export interface ConfiguracionCalificador {
  gradoId: number | null
  run: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  unidadNombre: string
  unidadSigla: string
  puesto: string
}

export interface ConfiguracionPeriodoActivo {
  nombre: string
  anio: number | null
  fechaInicio: string | null
  fechaTermino: string | null
  estado: string
  expedientesAsociados: number
}

export interface ConfiguracionNumeracion {
  prefijoResolucion: string
  ultimoCorrelativo: number
  proximoNumero: string
}

export interface ConfiguracionBaseDatos {
  estado: 'conectada' | 'desconectada'
  ruta: string
  tamanioAproximado: string
  ultimoRespaldo: string
}

export interface ConfiguracionAcercaDe {
  nombreAplicacion: string
  version: string
  desarrollador: string
  descripcion: string
}

export interface ConfiguracionSistema {
  calificador: ConfiguracionCalificador
  periodo: ConfiguracionPeriodoActivo
  numeracion: ConfiguracionNumeracion
  baseDatos: ConfiguracionBaseDatos
  acercaDe: ConfiguracionAcercaDe
}
