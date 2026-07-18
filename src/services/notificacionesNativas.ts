import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'

let permisoConcedido: boolean | null = null
let ultimoMensaje = ''
let ultimoEnvio = 0

async function asegurarPermiso(): Promise<boolean> {
  if (permisoConcedido !== null) return permisoConcedido

  permisoConcedido = await isPermissionGranted()
  if (!permisoConcedido) {
    permisoConcedido = (await requestPermission()) === 'granted'
  }

  return permisoConcedido
}

export async function notificarSistema(
  titulo: string,
  cuerpo: string,
): Promise<void> {
  const mensaje = cuerpo.trim()
  if (!mensaje) return

  const ahora = Date.now()
  if (mensaje === ultimoMensaje && ahora - ultimoEnvio < 2500) return

  try {
    if (!(await asegurarPermiso())) return
    sendNotification({ title: titulo, body: mensaje })
    ultimoMensaje = mensaje
    ultimoEnvio = ahora
  } catch (error) {
    console.warn('No fue posible mostrar la notificación nativa.', error)
  }
}

export function habilitarNotificacionesDeInterfaz(): () => void {
  const procesar = (elemento: Element): void => {
    const texto = elemento.textContent?.trim() ?? ''
    if (!texto) return

    const esError = elemento.matches(
      '.alert.error, .notice--error, .p-message-error, [data-notification="error"]',
    )
    const esExito = elemento.matches(
      '.alert.success, .notice--success, .p-message-success, [data-notification="success"]',
    )

    if (esError) void notificarSistema('HVDigital · Atención', texto)
    if (esExito) void notificarSistema('HVDigital', texto)
  }

  const observador = new MutationObserver(cambios => {
    for (const cambio of cambios) {
      cambio.addedNodes.forEach(nodo => {
        if (!(nodo instanceof Element)) return
        procesar(nodo)
        nodo.querySelectorAll(
          '.alert.error, .alert.success, .notice--error, .notice--success, .p-message-error, .p-message-success, [data-notification]',
        ).forEach(procesar)
      })
    }
  })

  observador.observe(document.body, { childList: true, subtree: true })
  return () => observador.disconnect()
}
