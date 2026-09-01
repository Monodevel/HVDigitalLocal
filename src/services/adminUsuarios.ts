import { apiJson } from '../web/api'

export interface UsuarioAdministrado {
  id: number
  usuario: string
  rol: 'ADMIN' | 'CALIFICADOR'
  activo: number
  ultimo_acceso_en: string | null
  calificador_directo_id: number | null
  grado_id?: number | null
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

export interface EditarUsuarioCalificadorInput {
  id: number
  usuario: string
  gradoId: number
  run?: string | null
  nombres: string
  apellidoPaterno: string
  apellidoMaterno?: string | null
  unidadNombre: string
  unidadSigla: string
  puesto: string
  activo: boolean
}

export async function listarUsuariosAdministrados(): Promise<UsuarioAdministrado[]> {
  return apiJson<UsuarioAdministrado[]>('/admin/usuarios')
}

export async function crearUsuarioCalificador(input: CrearUsuarioCalificadorInput): Promise<void> {
  await apiJson('/admin/usuarios', { method: 'POST', body: JSON.stringify(input) })
}

export async function editarUsuarioCalificador(input: EditarUsuarioCalificadorInput): Promise<void> {
  await apiJson('/db/execute', {
    method: 'POST',
    body: JSON.stringify({
      query: `UPDATE usuarios u
              INNER JOIN calificadores_directos cd ON cd.id = u.calificador_directo_id
              SET u.usuario = ?, u.activo = ?,
                  cd.grado_id = ?, cd.run = ?, cd.nombres = ?, cd.apellido_paterno = ?,
                  cd.apellido_materno = ?, cd.unidad_nombre = ?, cd.unidad_sigla = ?,
                  cd.puesto = ?, cd.actualizado_en = CURRENT_TIMESTAMP
              WHERE u.id = ? AND u.rol = 'CALIFICADOR'`,
      params: [
        input.usuario, input.activo ? 1 : 0, input.gradoId, input.run ?? null,
        input.nombres, input.apellidoPaterno, input.apellidoMaterno ?? null,
        input.unidadNombre, input.unidadSigla.toUpperCase(), input.puesto, input.id,
      ],
    }),
  })
}

export async function eliminarUsuarioCalificador(id: number): Promise<void> {
  // Eliminación lógica: bloquea el acceso sin destruir Hojas de Vida ni trazabilidad histórica.
  await apiJson('/db/execute', {
    method: 'POST',
    body: JSON.stringify({
      query: "UPDATE usuarios SET activo = 0 WHERE id = ? AND rol = 'CALIFICADOR'",
      params: [id],
    }),
  })
}
