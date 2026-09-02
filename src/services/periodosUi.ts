import { asegurarReglasPeriodos } from './periodosGestion'

let inicializado = false

/**
 * Mantiene únicamente las reglas de dominio necesarias para períodos.
 *
 * La interfaz actual controla el modo solo lectura desde el estado reactivo
 * del período seleccionado. No se deben deshabilitar controles recorriendo
 * el DOM: esa estrategia podía dejar inputs/selects bloqueados después de
 * cambiar desde un período cerrado a uno abierto y también afectaba filtros
 * que son válidos en modo consulta.
 */
export async function habilitarGestionPeriodos(): Promise<void> {
  if (inicializado) return
  inicializado = true

  try {
    await asegurarReglasPeriodos()
  } catch (error) {
    console.error('No fue posible asegurar las reglas de períodos.', error)
  }

  window.addEventListener('hvdigital-periodos-actualizados', () => {
    window.setTimeout(() => globalThis.location.reload(), 500)
  })
}
