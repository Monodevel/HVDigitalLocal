import { obtenerEstadoConfiguracionInicial, guardarCalificadorDirecto } from './configuracionInicial'
import { apiJson, obtenerSesionWeb, guardarSesionWeb } from '../web/api'
import type { DatosCalificadorDirecto, EstadoConfiguracionInicialDto } from '../types/configuracionInicial'

export interface PerfilUsuarioDto {
  usuario: string
  rol: 'ADMIN' | 'CALIFICADOR'
  nombreMostrar: string
  gradoId: number | null
  grado: string | null
  run: string | null
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  unidadNombre: string
  unidadSigla: string
  puesto: string
}

export async function obtenerPerfilUsuario(): Promise<PerfilUsuarioDto> {
  const [estado, sesion] = await Promise.all([
    obtenerEstadoConfiguracionInicial(),
    Promise.resolve(obtenerSesionWeb()),
  ])
  const nombreMostrar = [estado.grado_abreviatura, estado.nombres, estado.apellido_paterno, estado.apellido_materno]
    .filter(Boolean).join(' ').trim()
  return {
    usuario: sesion?.usuario ?? '',
    rol: sesion?.rol ?? 'CALIFICADOR',
    nombreMostrar: nombreMostrar || sesion?.usuario || '',
    gradoId: estado.grado_id,
    grado: estado.grado_abreviatura,
    run: estado.run,
    nombres: estado.nombres ?? '',
    apellidoPaterno: estado.apellido_paterno ?? '',
    apellidoMaterno: estado.apellido_materno ?? '',
    unidadNombre: estado.unidad_nombre ?? '',
    unidadSigla: estado.unidad_sigla ?? '',
    puesto: estado.puesto ?? '',
  }
}

export async function guardarPerfilUsuario(datos: DatosCalificadorDirecto): Promise<EstadoConfiguracionInicialDto> {
  await guardarCalificadorDirecto(datos)
  const actualizado = await obtenerEstadoConfiguracionInicial()
  const sesion = obtenerSesionWeb()
  if (sesion) {
    const nombreMostrar = [actualizado.grado_abreviatura, actualizado.nombres, actualizado.apellido_paterno, actualizado.apellido_materno]
      .filter(Boolean).join(' ').trim()
    guardarSesionWeb({ ...sesion, nombreMostrar: nombreMostrar || sesion.usuario })
  }
  return actualizado
}

export async function cambiarPasswordUsuario(actual: string, nueva: string): Promise<string> {
  const sesion = obtenerSesionWeb()
  if (!sesion) throw new Error('La sesión no está disponible.')
  const respuesta = await apiJson<{ message: string }>('/auth/password', {
    method: 'POST',
    body: JSON.stringify({ usuario: sesion.usuario, passwordActual: actual, passwordNueva: nueva }),
  })
  return respuesta.message
}
