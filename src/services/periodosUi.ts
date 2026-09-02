let inicializado = false

/**
 * Compatibilidad mínima para integraciones antiguas.
 *
 * La aplicación web trabaja exclusivamente contra HVDigital Server/MariaDB.
 * No se inicializa SQLite ni se crean triggers locales desde el navegador.
 * Las reglas de períodos deben vivir en el backend y sus migraciones.
 */
export async function habilitarGestionPeriodos(): Promise<void> {
  if (inicializado) return
  inicializado = true

  window.addEventListener('hvdigital-periodos-actualizados', () => {
    window.setTimeout(() => globalThis.location.reload(), 500)
  })
}
