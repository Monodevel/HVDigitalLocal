export interface Configuracion {
    id: number
    unidad_nombre: string
    unidad_sigle: string
    responsable: string
    periodo_activo_id: number | null
    configurado_en: string
}

export interface Periodo{
    id: number
    nombre:string
    anio:number
    fecha_inicio:string
    fecha_termino:string
    estado: 'abierto'| 'cerrado'
    creado_en:string
}

export interface ConfiguracionInicialRequest {
    unidadNombre:string
    unidadSigla:string
    responsable:string
}

export interface CrearPeriodoRequest {
    nombre:string
    anio:number
    fechaInicio:string
    fechaTermino:string
}