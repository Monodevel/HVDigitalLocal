import type {
  CampoFormularioAnotacion,
  TipoDatoVariable,
  ValoresPlantilla,
  VariablePlantillaAnotacion,
} from '../types/anotaciones'

const EXPRESION_VARIABLE = /\{\{([a-zA-Z0-9_]+)\}\}/g

const ETIQUETAS: Record<string, string> = {
  tipo_personal: 'Tipo de personal',
  fecha_nombramiento: 'Fecha de nombramiento',
  fecha_contratacion: 'Fecha de contratación',
  nota_egreso: 'Nota de egreso',
  puesto: 'Puesto',
  total_alumnos: 'Total de alumnos',
  concepto: 'Concepto de calificación',
  puntaje_numerico: 'Puntaje',
  puntaje_texto: 'Puntaje en palabras',
  tipo_documento: 'Tipo de documento',
  numero_documento: 'Número de documento',
  fecha_documento: 'Fecha del documento',
  tipo_sancion: 'Tipo de sanción',
  cantidad_dias_numero: 'Cantidad de días',
  cantidad_dias_texto: 'Cantidad de días en palabras',
  tipo_arresto: 'Tipo de arresto',
  fecha_presentacion: 'Fecha de presentación',
  resultado_recurso: 'Resultado del recurso',
  fundamento_resultado: 'Fundamento del resultado',
  fecha_sancion: 'Fecha de la sanción',
  dias_licencia: 'Días de licencia',
  fecha_inicio: 'Fecha de inicio',
  fecha_termino: 'Fecha de término',
  tipo_licencia: 'Tipo de licencia',
  dias_pendientes: 'Días pendientes',
  fecha_notificacion: 'Fecha de notificación',
  tipo_recurso: 'Tipo de recurso',
  accion_recurso: 'Acción sobre el recurso',
  numero_evint: 'Número de EVINT',
  periodo: 'Período',
  motivo: 'Motivo',
  cargo_despliegue: 'Cargo durante el despliegue',
  jefatura_destino: 'Jefatura de destino',
  cantidad_dias: 'Cantidad de días',
  cargo: 'Cargo',
  lugar: 'Lugar',
}

const TIPOS: Record<string, TipoDatoVariable> = {
  fecha_nombramiento: 'FECHA',
  fecha_contratacion: 'FECHA',
  fecha_documento: 'FECHA',
  fecha_presentacion: 'FECHA',
  fecha_sancion: 'FECHA',
  fecha_inicio: 'FECHA',
  fecha_termino: 'FECHA',
  fecha_notificacion: 'FECHA',
  nota_egreso: 'DECIMAL',
  puesto: 'ENTERO',
  total_alumnos: 'ENTERO',
  cantidad_dias_numero: 'ENTERO',
  dias_licencia: 'ENTERO',
  dias_pendientes: 'ENTERO',
  cantidad_dias: 'ENTERO',
  concepto: 'CONCEPTO',
  puntaje_numerico: 'PUNTAJE',
  fundamento_resultado: 'TEXTO_LARGO',
}

const OPCIONES: Record<string, string[]> = {
  tipo_personal: ['Oficial', 'Suboficial'],
  tipo_recurso: [
    'recurso jerárquico',
    'recurso de reposición y jerárquico en subsidio',
  ],
  accion_recurso: ['presentó', 'no presentó'],
  numero_evint: ['1ra', '2da'],
  tipo_licencia: ['TOTAL', 'PARCIAL'],
  resultado_recurso: ['rechazar', 'acoger'],
  tipo_arresto: [
    'arresto con servicio',
    'arresto militar',
    'arresto de rigor',
  ],
}

export function renderizarPlantilla(
  plantilla: string,
  valores: ValoresPlantilla,
): string {
  return plantilla.replace(
    EXPRESION_VARIABLE,
    (_, codigo: string) => {
      const valor = valores[codigo]

      if (
        valor === undefined ||
        valor === null ||
        String(valor).trim() === ''
      ) {
        return `{{${codigo}}}`
      }

      return String(valor)
    },
  )
}

export function extraerCodigosVariables(
  plantilla: string,
): string[] {
  return Array.from(
    new Set(
      Array.from(
        plantilla.matchAll(EXPRESION_VARIABLE),
        resultado => resultado[1],
      ),
    ),
  )
}

export function construirCamposFormulario(
  plantilla: string,
  variablesRegistradas: VariablePlantillaAnotacion[],
): CampoFormularioAnotacion[] {
  const porCodigo = new Map(
    variablesRegistradas.map(variable => [
      variable.codigo,
      variable,
    ]),
  )

  return extraerCodigosVariables(plantilla).map(
    (codigo, indice) => {
      const registrada = porCodigo.get(codigo)

      let opciones: string[] = []
      if (registrada?.opciones_json) {
        try {
          opciones = JSON.parse(registrada.opciones_json)
        } catch {
          opciones = []
        }
      }

      if (opciones.length === 0) {
        opciones = OPCIONES[codigo] ?? []
      }

      return {
        codigo,
        etiqueta:
          registrada?.etiqueta ??
          ETIQUETAS[codigo] ??
          codigo
            .replace(/_/g, ' ')
            .replace(/^\w/, (letra: string) => letra.toUpperCase()),
        tipo_dato:
          registrada?.tipo_dato ??
          TIPOS[codigo] ??
          (opciones.length > 0 ? 'SELECCION' : 'TEXTO'),
        requerido: registrada?.requerido ?? 1,
        orden: registrada?.orden ?? indice + 1,
        opciones,
        ayuda: registrada?.ayuda ?? null,
      }
    },
  ).sort((a, b) => a.orden - b.orden)
}

export function obtenerVariablesPendientes(
  campos: CampoFormularioAnotacion[],
  valores: ValoresPlantilla,
): CampoFormularioAnotacion[] {
  return campos.filter(campo => {
    if (campo.requerido !== 1) return false

    const valor = valores[campo.codigo]
    return (
      valor === undefined ||
      valor === null ||
      String(valor).trim() === ''
    )
  })
}

export function validarPlantillaCompletada(
  texto: string,
): void {
  const pendientes = extraerCodigosVariables(texto)

  if (pendientes.length > 0) {
    throw new Error(
      `Faltan campos por completar: ${pendientes.join(', ')}.`,
    )
  }
}
