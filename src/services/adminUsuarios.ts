import { apiJson } from '../web/api'

export interface UsuarioAdministrado {
  id: number
  usuario: string
  rol: 'ADMIN' | 'CALIFICADOR'
  activo: number
  ultimo_acceso_en: string | null
  calificador_directo_id: number | null
  grado: string | null
  run: string | null
  nombres: string | null
  apellido_paterno: string | null
  apellido_materno: string | null
  unidad_nombre: string | null
  unidad_sigla: string | null
  puesto: string | null
  configuracion_estado: string | null
  periodo_activo_id: number | null
}

export interface CrearUsuarioCalificadorInput {
  usuario: string
  password: string
  gradoId: number
  run?: string | null
  nombres: string
  apellidoPaterno: string
  apellidoMaterno?: string | null
  unidadNombre: string
  unidadSigla: string
  puesto: string
}

export async function listarUsuariosAdministrados(): Promise<UsuarioAdministrado[]> {
  return apiJson<UsuarioAdministrado[]>('/admin/usuarios')
}

export async function crearUsuarioCalificador(input: CrearUsuarioCalificadorInput): Promise<void> {
  await apiJson('/admin/usuarios', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
