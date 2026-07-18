export interface DashboardResumenPeriodo {
  periodoNombre: string
  periodoActual: string
  calificados: number
  expedientesActivos: number
  anotacionesPeriodo: number
  instrumentosPendientes: number

  anotacionesPendientesEstampar: number
  resolucionesEmitidasDisponibles: number
  instrumentosCompletadosPorcentaje: number
  instrumentosCompletados: number
  totalInstrumentos: number
  hc2Pendientes: number
  evintPendientes: number
}

export interface DashboardPerfilCalificador {
  nombre: string
  cargo: string
  estado: string
}

export interface DashboardPendiente {
  expedienteId: number
  hojaVidaId: number | null
  persona: string
  grado: string
  instrumento: string
  prioridad: 'Alta' | 'Media' | 'Baja'
  venceEl: string | null
}

export interface DashboardInstrumentoEstado {
  instrumento: string
  completados: number
  total: number
  porcentaje: number
  estado: 'Completo' | 'En proceso' | 'Pendiente'
}

export interface DashboardAlerta {
  id: string
  tipo: 'danger' | 'warning' | 'info'
  titulo: string
  total: number
  accion: string
}

export interface DashboardExpedienteReciente {
  expedienteId: number
  hojaVidaId: number | null
  calificado: string
  grado: string
  categoria: string
  estadoGeneral: string
  estadoTipo: 'success' | 'info' | 'warning' | 'danger' | 'neutral'
  proximaAccion: string
}

export interface DashboardDistribucionCategoria {
  categoria: string
  total: number
  porcentaje: number
}

export interface DashboardAnotacionesPeriodo {
  merito: number
  demerito: number
  otras: number
  total: number
}

export interface DashboardHito {
  titulo: string
  fecha: string
}

export interface DashboardPrincipal {
  resumen: DashboardResumenPeriodo
  calificador: DashboardPerfilCalificador
  pendientes: DashboardPendiente[]

  instrumentos: DashboardInstrumentoEstado[]
  alertas: DashboardAlerta[]
  expedientesRecientes: DashboardExpedienteReciente[]
  distribucionCategorias: DashboardDistribucionCategoria[]
  anotaciones: DashboardAnotacionesPeriodo
  hitos: DashboardHito[]
}
