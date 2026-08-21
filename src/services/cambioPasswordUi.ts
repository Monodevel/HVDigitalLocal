import { createApp, type App as VueApp } from 'vue'
import CambioPasswordCard from '../components/configuracion/CambioPasswordCard.vue'

let app: VueApp<Element> | null = null
let host: HTMLElement | null = null
let observer: MutationObserver | null = null
let sincronizando = false

function desmontar(): void {
  app?.unmount()
  app = null
  host?.remove()
  host = null
}

function sincronizar(): void {
  if (sincronizando) return
  sincronizando = true

  try {
    const seguridad = Array.from(document.querySelectorAll<HTMLElement>('.settings-section'))
      .find(section => section.querySelector('h2')?.textContent?.trim() === 'Protección e integridad')

    if (!seguridad) {
      if (host?.isConnected) desmontar()
      return
    }

    if (host?.isConnected && seguridad.contains(host)) return

    desmontar()
    const nuevoHost = document.createElement('div')
    nuevoHost.className = 'hv-password-settings-host'

    const securityGrid = seguridad.querySelector('.security-grid')
    if (securityGrid?.nextSibling) seguridad.insertBefore(nuevoHost, securityGrid.nextSibling)
    else seguridad.appendChild(nuevoHost)

    app = createApp(CambioPasswordCard)
    app.mount(nuevoHost)
    host = nuevoHost
  } finally {
    sincronizando = false
  }
}

export function habilitarCambioPasswordConfiguracion(): void {
  if (observer) return
  sincronizar()
  observer = new MutationObserver(sincronizar)
  observer.observe(document.body, { childList: true, subtree: true })
}
