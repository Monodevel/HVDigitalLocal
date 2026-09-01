import type {
  DatosCalificadorDirecto,
  EstadoConfiguracionInicialDto,
  ResultadoCreacionPeriodo,
} from '../types/configuracionInicial'
import { apiJson } from '../web/api'

function textoObligatorio(valor: string, etiqueta: string): string {
  const limpio = valor.trim()
  if (!limpio) throw new Error(`Debe completar ${etiqueta}.`)
  return limpio
}

/** Estado privado de configuración de la cuenta autenticada. */
export async function obtenerEstadoConfiguracionInicial(): Promise<EstadoConfiguracionInicialDto> {
  return apiJson<EstadoConfiguracionInicialDto>('/configuracion/inicial')
}

/** Actualiza únicamente el perfil institucional asociado a la sesión. */
export async function guardarCalificadorDirecto(datos: DatosCalificadorDirecto): Promise<number> {
  if (!Number.isInteger(datos.gradoId) || datos.gradoId <= 0) {
    throw new Error('Debe seleccionar el grado del calificador.')
  }

  const respuesta = await apiJson<{ calificadorId: number }>('/configuracion/calificador', {
    method: 'PUT',
    body: JSON.stringify({
      gradoId: datos.gradoId,
      run: datos.run?.trim() || null,
      nombres: textoObligatorio(datos.nombres, 'los nombres'),
      apellidoPaterno: textoObligatorio(datos.apellidoPaterno, 'el apellido paterno'),
      apellidoMaterno: datos.apellidoMaterno?.trim() || null,
      unidadNombre: textoObligatorio(datos.unidadNombre, 'la unidad o repartición'),
      unidadSigla: textoObligatorio(datos.unidadSigla, 'la sigla de la unidad').toUpperCase(),
      puesto: textoObligatorio(datos.puesto, 'el puesto'),
    }),
  })

  return Number(respuesta.calificadorId)
}

/** Crea el primer período dentro de la instancia lógica del usuario. */
export async function crearPeriodoInicial(anioInicio: number): Promise<ResultadoCreacionPeriodo> {
  const anioActual = new Date().getFullYear()
  if (!Number.isInteger(anioInicio) || anioInicio < anioActual - 10 || anioInicio > anioActual + 5) {
    throw new Error('El año seleccionado no es válido.')
  }

  return apiJson<ResultadoCreacionPeriodo>('/configuracion/periodo-inicial', {
    method: 'POST',
    body: JSON.stringify({ anioInicio }),
  })
}
