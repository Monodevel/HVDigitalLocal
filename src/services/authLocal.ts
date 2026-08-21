import { invoke } from '@tauri-apps/api/core'

export async function cambiarPasswordLocal(
  usuario: string,
  passwordActual: string,
  passwordNueva: string,
): Promise<string> {
  return invoke<string>('cambiar_password_local', {
    usuario,
    passwordActual,
    passwordNueva,
  })
}
