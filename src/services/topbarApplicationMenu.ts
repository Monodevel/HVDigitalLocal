import { createApp, type App as VueApp } from 'vue'

import TopbarApplicationMenu from '../components/layout/TopbarApplicationMenu.vue'

let aplicacion: VueApp<Element> | null = null
let contenedorActual: HTMLElement | null = null
let observador: MutationObserver | null = null

function montar(): void {
  const barra = document.querySelector<HTMLElement>('.hv-topbar')

  if (!barra) {
    if (aplicacion) {
      aplicacion.unmount()
      aplicacion = null
      contenedorActual = null
    }
    return
  }

  if (contenedorActual?.isConnected && contenedorActual.parentElement === barra) return

  aplicacion?.unmount()
  barra.querySelector('.hv-topbar-menu-host')?.remove()

  const host = document.createElement('div')
  host.className = 'hv-topbar-menu-host'
  barra.appendChild(host)

  aplicacion = createApp(TopbarApplicationMenu)
  aplicacion.mount(host)
  contenedorActual = host
}

export function habilitarMenuBarraSuperior(): void {
  if (observador) return

  montar()
  observador = new MutationObserver(montar)
  observador.observe(document.body, { childList: true, subtree: true })
}
